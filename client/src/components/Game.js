/* globals require */
import React from 'react';
import io from 'socket.io-client';
import { TransitionGroup, CSSTransition } from "react-transition-group";
import FlipMove from 'react-flip-move';

import {PulseLoader} from "halogenium";
import {withRouter} from "react-router-dom";

import avatars from '../data/avatars.json';

import shortid from 'short-id';

// deal with connecting here
const socket = io('http://localhost:5005');

class Game extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            players: [],
            myID: null,
            currentPlayerID: null,
            current: [],
            left: '',
            right: '',
            inDict: false,
            stillWinnable: true,
            deltas: []
        };
    }

    componentDidMount() {
        // check if we've received a name, otherwise we can't subscribe yet
        const {name, avatar} = this.props;

        if (!name || !avatar) {
            this.props.history.replace('/profile');
            return;
        }

        console.log(`name: ${name}, avatar: ${avatar.name}`);

        if (name && avatar) {
            this.subscribeToGame(name, avatar.name);
        }
        else {
            this.props.history.replace('/profile');
        }
    }

    subscribeToGame = (name, avatar) => {
        socket.on('updatePlayerStatuses', this.playersUpdated);
        socket.on('wordUpdated', this.wordUpdated);
        socket.on('yourID', this.myIDReceived);
        socket.on('currentPlayerChanged', this.currentPlayerChanged);

        // challenges
        socket.on('challengeInProgress', this.challengeInProgress);
        socket.on('challengeResolved', this.challengeResolved);

        // server meta
        socket.on('disconnect', (reason) => {
            console.log("server kicked us!: ", reason);
            this.props.history.replace('/profile');
        });

        // adds us to the game
        socket.emit('subscribeToGame', name, avatar);
    };

    playersUpdated = (players) => {
        this.setState((pstate) => {
            // any players who have different scores need to show an animated change
            const newDeltas = Object.entries(pstate.players)
                .filter(([k,v]) => players[k])
                .map(([k,v]) => ({
                    id: v.id,
                    deltaID: shortid.generate(),
                    delta: players[k].score - v.score,
                    deathtime: Date.now() + 1000
                }))
                .filter(x => x.delta !== 0);

            return {
                players,
                deltas: pstate.deltas.concat(newDeltas)
            };
        }, () => {
            console.log(`score deltas: ${JSON.stringify(this.state.deltas)}`);

            // eventually clean up any dead deltas
            setTimeout(() => {
                this.setState((pstate) => ({
                    deltas: pstate.deltas.filter(x => x.deathtime > Date.now())
                }));
            }, 1100);
        });
    };

    wordUpdated = (currentWord) => {
        this.receiveChange(currentWord);
    };

    currentWordText = () => {
        return this.state.current.map(({letter}) => letter).join("");
    };

    challengeInProgress = (accuser, accused) => {
        console.log(`${accuser} is challening ${accused} over ${this.state.current.map(({letter}) => letter).join("")}`)
        this.setState({
            challengeInProgress: true
        });
    };

    challengeResolved = (accuser, accused, violated) => {
        console.log("resolved! violation?: ", violated);

        this.setState({
            challengeInProgress: false
        });
    };

    myIDReceived = (myID) => {
        this.setState({ myID });
    };

    currentPlayerChanged = (currentPlayerID) => {
        this.setState({ currentPlayerID }, () => {
            // if we're now the current player, focus the leftbox
            if (this.isMyTurn() && this.leftbox) {
                this.leftbox.focus();
            }
        });
    };

    edited = (event) => {
        const side = event.target.name;

        this.setState({
            [side === 'left_insert' ? 'left' : 'right']: event.target.value.toLocaleLowerCase()
        });
    };

    requestChange = () => {
        // FIXME: check if we're connected; use local state if we're not

        const {left, right} = this.state;

        // reject if they didn't type anything
        if (!left && !right) {
            return;
        }

        const isRightUpdate = right.length > 0;
        socket.emit('updateWord', isRightUpdate ? right : left, isRightUpdate);
    };

    isChallengeAllowed = () => {
        return this.isMyTurn() && this.state.current.length > 3;
    };

    requestChallenge = () => {
        // TODO: send challenge request to server
        socket.emit('challengeRequested');
    };

    receiveChange = (status) => {
        this.setState({
            current: status.currentWord,
            inDict: status.inDict,
            stillWinnable: status.stillWinnable,
            left: '',
            right: ''
        });
    };

    checkEnter = (event) => {
        if (event.key === 'Enter') {
            this.requestChange();
        }
    };

    resetGame = () => {
        // FIXME: check if we're connected; use local state if we're not
        socket.emit('requestReset');
    };

    isMyTurn = () => {
        return this.state.currentPlayerID === this.state.myID;
    };

    render() {
        const {left, right, current, inDict} = this.state;

        const myTurnBlurb = (
            current.length > 0
                ? (
                    !inDict
                        ? (
                            <i>
                                <div>good so far...</div>
                                { this.isMyTurn() && <h3>(it's your turn, by the way)</h3> }
                            </i>
                        )
                        : <i>
                            <div>oops!</div>
                            <a target="_blank" href={`http://www.dictionary.com/browse/${this.currentWordText()}`}>look up word</a>
                        </i>
                )
                : (this.isMyTurn() ? <i>enter a letter to begin</i> : <i>waiting for other players...</i>)
        );

        // me
        const avatarEntry = this.props.avatar ? avatars[this.props.avatar.name] : null;
        const avatarImage = avatarEntry
            ? <img width={30} height={30} src={require(`../${avatarEntry.filename}`)} alt={avatarEntry.name} />
            : null;

        return (
            <div className="Screen">
                <div className="CenterModal">
                    {/*
                    <div style={{flex: '0.2 0 auto', justifyContent: 'flex-start'}}>
                        <div style={{display: 'flex', alignItems: 'center', padding: '5px', background: '#eee', width: '100%'}}>
                            {this.props.name} {avatarImage}
                            <a href="/profile">change name/avatar</a>
                        </div>
                    </div>
                    */}

                    <div className="Controls" style={{flex: '0.8 0'}}>
                        <div className="DictIndicator">
                        { myTurnBlurb }
                        </div>

                        <div className={`WordHolder CurrentSegment ${inDict ? 'error' : ''}`}>
                            {
                                !inDict && current.length > 0 && right === '' &&
                                <input type="text" name="left_insert" disabled={!this.isMyTurn()} onChange={this.edited} onKeyPress={this.checkEnter} value={left} className="NewLetter WordStyler" maxLength={1} />
                            }

                            { current.map(({ key, letter }) => <span key={key} className="WordStyler CommittedLetter">{letter}</span>) }

                            {
                                !inDict && left === '' &&
                                <input type="text" ref={(me) => { this.leftbox = me; }} autoFocus={true} disabled={!this.isMyTurn()} name="right_insert" onChange={this.edited} onKeyPress={this.checkEnter} value={right} className="NewLetter WordStyler" maxLength={1}/>
                            }
                        </div>

                        <div className="ButtonTray">
                        { !inDict
                            ? <button className={`Button Commit ${left || right ? 'ready' : ''}`} onClick={this.requestChange}>commit</button>
                            : <button className={`Button ${ this.isMyTurn() && "Reset" }`} onClick={this.resetGame}>reset</button>
                        }

                        { !inDict &&
                            <button className={`Button ${ this.isChallengeAllowed() && "Challenge" }`} onClick={this.requestChallenge}>
                            { !this.state.challengeInProgress ? "challenge" : <PulseLoader color="white" size="4px" margin="4px" /> }
                            </button>
                        }
                        </div>
                    </div>

                    <FlipMove className="PlayerTray" duration={400} easing="ease-in-out">
                    {
                        this.state.players.map((player) => {
                            const isPlayersTurn = player.id === this.state.currentPlayerID;

                            const avatarEntry = player.avatar ? avatars[player.avatar] : null;
                            const avatarImage = avatarEntry
                                ? <img width={30} height={30} src={require(`../${avatarEntry.filename}`)} alt={player.avatar} />
                                : null;

                            return (
                                <div key={player.id}
                                    className={`PlayerTile ${isPlayersTurn ? 'current' : ''} ${ player.id === this.state.myID ? 'you' : ''}`}>

                                    <div className="PlayerPortrait">
                                    { avatarImage }
                                    </div>

                                    <div className="PlayerID">{player.name}</div>
                                    <div className="PlayerScore">{
                                        player.score > 0 ? "ghost".slice(0, player.score) : '-'
                                    }</div>

                                    <div className="arrow-down"/>

                                    <div className="deltas">
                                    {
                                        // render per-player animated deltas
                                        this.state.deltas
                                            .filter(x => x.id === player.id)
                                            .map((x) =>
                                                <div className={`score-delta ${x.delta > 0 ? 'score-up' : 'score-down'}`}>
                                                {x.delta > 0 ? '💥' : ''}
                                                </div>
                                            )
                                    }
                                    </div>
                                </div>
                            );
                        })
                    }
                    </FlipMove>

                    {/*<button id="HardReset" className="Button" onClick={this.resetGame}>h a r d r e s e t</button>*/}
                </div>
            </div>
        );
    }
}

export default withRouter(Game);