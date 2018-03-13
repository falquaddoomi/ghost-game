import React from 'react';
import FlipMove from 'react-flip-move';

import {subscribeToGame, updateWord, requestReset, challengeRequested} from './api';
import {PulseLoader} from "halogenium";

export default class GhostGame extends React.Component {
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
            stillWinnable: true
        };
    }

    componentDidMount() {
        subscribeToGame(
            this.playersUpdated, this.wordUpdated, this.myIDReceived, this.currentPlayerChanged,
            this.challengeInProgress, this.challengeResolved
        );
    }

    playersUpdated = (players) => {
        this.setState({ players })
    };

    wordUpdated = (currentWord) => {
        this.receiveChange(currentWord);
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
        updateWord(isRightUpdate ? right : left, isRightUpdate);
    };

    requestChallenge = () => {
        // TODO: send challenge request to server
        challengeRequested();
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
        requestReset();
    };

    isMyTurn = () => {
        return this.state.currentPlayerID === this.state.myID;
    };

    render() {
        const {left, right, current, inDict, stillWinnable} = this.state;

        const myTurnBlurb = (
            current.length > 0
                ? (
                    !inDict
                        ? (
                            <i>
                                <div>good so far...</div>
                                { this.isMyTurn() && <h3>(it's your turn, by the way)</h3> }
                                { stillWinnable || <div>(it's no longer winnable, though...)</div>}
                            </i>
                        )
                        : <a target="_blank" href={`http://www.dictionary.com/browse/${current}`}>oops!</a>
                )
                : (this.isMyTurn() ? <i>enter a letter to begin</i> : <i>waiting for other players...</i>)
        );

        return (
            <div className="CenterModal">
                <div style={{flex: '0.2 0'}} />
                <div className="Controls" style={{flex: '0.8 0'}}>
                    <div className="DictIndicator">
                    { myTurnBlurb }
                    </div>

                    <div className={`WordHolder CurrentSegment ${inDict ? 'error' : ''}`}>
                        {
                            !inDict && current.length > 0 && right === '' &&
                            <input type="text" name="left_insert" disabled={!this.isMyTurn()} onChange={this.edited} onKeyPress={this.checkEnter} value={left} className="NewLetter WordStyler" maxLength={1} />
                        }

                        { current.map(({ key, letter }) => <span key={key} className="WordStyler">{letter}</span>) }

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
                        <button className={`Button ${ current.length > 0 && "Challenge" }`} onClick={this.requestChallenge}>
                        { !this.state.challengeInProgress ? "challenge" : <PulseLoader color="white" size="4px" margin="4px" /> }
                        </button>
                    }
                    </div>
                </div>

                <FlipMove className="PlayerTray" duration={400} easing="ease-in-out">
                {
                    this.state.players.map((id, idx) =>
                        <div key={id} className={`PlayerTile ${id === this.state.currentPlayerID ? 'current' : ''} ${ id === this.state.myID ? 'you' : ''}`}>
                            <div className="PlayerID">{id.substr(0, 5)}</div>
                            { id === this.state.myID && <div>(you)</div> }
                        </div>
                    )
                }
                </FlipMove>

                {/*<button id="HardReset" className="Button" onClick={this.resetGame}>h a r d r e s e t</button>*/}
            </div>
        );
    }
}