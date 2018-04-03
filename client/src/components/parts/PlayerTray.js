import React from 'react';
import FlipMove from 'react-flip-move';
import shortid from 'short-id';

import avatars from '../../data/avatars.json';

export class AvatarImage extends React.Component {
    render() {
        const myAvatar = this.props.avatar;

        // create avatars for the challenger/challenged players
        const avatarEntry = myAvatar ? avatars[myAvatar] : null;
        return avatarEntry
            ? <img width={30} height={30} src={require(`../../${avatarEntry.filename}`)} alt={myAvatar}/>
            : null;
    }
}

class PlayerTile extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            deltas: []
        };
    }

    componentWillReceiveProps(nextProps) {
        // populate the list of score deltas to render for this player
        const {player} = this.props;

        if (player !== nextProps.player) {
            const nextScore = nextProps.player.score;

            // if our score's changed, display a delta
            if (player.score - nextProps.player.score !== 0) {
                this.setState((pstate) => {
                    return {
                        deltas: pstate.deltas.concat({
                            deltaID: shortid.generate(),
                            delta: nextScore - player.score,
                            deathtime: Date.now() + 1000
                        })
                    };
                }, () => {
                    // eventually clean up any dead deltas
                    setTimeout(() => {
                        this.setState((pstate) => ({
                            deltas: pstate.deltas.filter(x => x.deathtime > Date.now())
                        }));
                    }, 1100);
                });
            }
        }
    }

    static ouchIcon(playerScore) {
        if (playerScore < 5) {
            return '💥';
        }
        else {
            return '💀';
        }
    }

    render() {
        const {player, currentPlayerID, myID} = this.props;
        const {deltas} = this.state;

        const isPlayersTurn = player.id === currentPlayerID;

        const classes = [
            'PlayerTile',
            isPlayersTurn ? 'current' : '',
            player.id === myID ? 'you' : '',
            player.score >= 5 ? 'dead' : ''
        ];

        return (
            (
                <div key={player.id} className={classes.join(' ')}>
                    <div className="PlayerPortrait">
                        <AvatarImage avatar={player.avatar} />
                    </div>

                    <div className="PlayerID">{player.name}</div>

                    <FlipMove className="PlayerScore" duration={400} easing="ease-in-out">
                    {
                        player.score > 0
                            ? "ghost"
                            .slice(0, player.score)
                            .split('')
                            .map((letter, idx) => <span className="ScoreLetter" key={idx}>{letter}</span>)
                            : <span key={-1} className="ScoreLetter">-</span>
                    }
                    </FlipMove>

                    <div className="arrow-down"/>

                    <div className="deltas">
                    {
                        // render per-player animated deltas
                        deltas
                            .map((x) =>
                                <div key={x.deltaID} className="score-delta score-up">
                                { PlayerTile.ouchIcon(player.score) }
                                </div>
                            )
                    }
                    </div>
                </div>
            )
        )
    }
}

export default class PlayerTray extends React.Component {
    render() {
        return (
            <FlipMove className="PlayerTray" duration={400} easing="ease-in-out">
            {
                this.props.players.map((player) =>
                    <PlayerTile key={player.id}
                        player={player}
                        myID={this.props.myID}
                        currentPlayerID={this.props.currentPlayerID}
                    />
                )
            }
            </FlipMove>
        );
    }
}
