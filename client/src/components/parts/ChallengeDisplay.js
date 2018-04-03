import React from 'react';

import {AvatarImage} from '../parts/PlayerTray';

export default class ChallengeDisplay extends React.Component {
    render() {
        const {
            challengeInProgress,
            players,
            challengerID,
            accusedID,
            violated
        } = this.props;

        // FIXME: smoothly transition in and out of challenges, esp. out (e.g. display the result of the challenge)
        if (!challengeInProgress) {
            return <div className="ChallengeDisplay" />;
        }

        // get challenger and accused from players collection
        const challenger = players.find(p => p.id === challengerID);
        const accused = players.find(p => p.id === accusedID);

        return <div className="ChallengeDisplay">
            <div className="challenge-contender challenger">
                <AvatarImage avatar={challenger.avatar} />
            </div>

            <div className="conflicter">💥</div>

            <div className="challenge-contender accused">
                <AvatarImage avatar={accused.avatar} />
            </div>
        </div>
    }
}
