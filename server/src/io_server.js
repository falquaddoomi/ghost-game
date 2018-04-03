/* globals require */

import {PlayerList} from "./players";
import {WordState} from "./words";
import io from 'socket.io';

const port = 5005;

const CHALLENGE_DURATION = 3 * 1000; // 10 seconds

class GhostGame {
    constructor(port) {
        this.server = io(port);
        this.createGame();

        console.log('listening on port', port);

        this.players = new PlayerList(this.server);
        this.wordState = new WordState(this.server);

        this.players.lastPlayedClient = null;
    }

    createGame() {
        this.server.on('connection', (client) => {
            client.on('subscribeToGame', (name, avatar) => this.playerSubscribed(client, name, avatar));
        });
    }

    //
    // player lifecycle events
    //

    playerSubscribed(client, name, avatar) {
        // ---------------------------------------------------------------------------------
        // --- perform player init on subscription
        // ---------------------------------------------------------------------------------

        const current_id = this.players.add(client, name, avatar);

        console.log(`client ${name} (w/avatar ${avatar}) subscribed to the game w/ID ${current_id}`);
        console.log("sending current word: ", this.currentWord);

        // tell this player who they are, what the current word is, and who's the current player
        client.emit('yourID', current_id);
        client.emit('currentPlayerChanged', this.players.current().id);
        this.wordState.sendUpdatedWord(client);

        // tell everyone there's a new player
        this.players.emitStatuses();

        // ---------------------------------------------------------------------------------
        // --- define player-sent events
        // ---------------------------------------------------------------------------------

        client.on('updateWord', (letter, isRightUpdate) => this.wordUpdated(client, letter, isRightUpdate));
        client.on('requestReset', () => this.resetRequested(client));
        client.on('challengeRequested', () => this.challengeRequested(client));

        // ---------------------------------------------------------------------------------
        // --- deal with disconnecting players, too
        // ---------------------------------------------------------------------------------

        // we need to remove them if they disconnect, too
        client.on('disconnect', () => this.playerDisconnected(client));
    }

    playerDisconnected(client) {
        this.players.remove(client);
        this.players.emitStatuses();

        // if nobody's left, reset
        if (this.players.empty()) {
            console.log("Resetting due to last player parting, waiting...");
            this.wordState.reset();
        }
    }

    //
    // player action handling
    //

    wordUpdated(client, letter, isRightUpdate) {
        // ensure that it was this client's turn
        if (!this.players.isPlayersTurn(client)) {
            // TODO: maybe scold the player if it's not their turn?
            return;
        }

        this.wordState.concatenate(letter, isRightUpdate);

        // remember the last player who took a turn in case there's a challenge or they lose
        this.players.lastPlayedClient = client;

        // FIXME: check word status?
        this.players.advanceTurn();
    }

    challengeRequested(client) {
        // this can be sent by any player at any time; the 'offender' is the last player to submit a letter
        // it pauses the game to "consult the dictionary",
        // then penalizes the offender and restarts the game if the challenge goes through
        // or penalizes the challenger and continues if the challenge fails

        if (!this.players.isPlayersTurn(client) || this.wordState.belowMinLength() || !this.players.lastPlayedClient || (this.players.lastPlayedClient === client && this.players.numPlayers() > 1)) {
            // there has to be a word played, a last-played client,
            // and you can't challenge yourself (unless you're playing by yourself)
            console.log("* challenge attempted, but didn't meet the requirements");
            return;
        }

        console.log("* challenge requested...");

        this.server.emit('challengeInProgress', client.id, this.players.lastPlayedClient.id);

        setTimeout(() => {
            const result = this.wordState.checkChallenge();

            console.log("...and resolved as", result.violated);
            // send a sample of 10 words that would have been possible, too
            this.server.emit('challengeResolved', client.id, this.players.lastPlayedClient.id, result.violated, result.words.slice(0,10));

            if (result.violated) {
                // penalize the challenged player and let everyone know
                const challenged = this.players.get(this.players.lastPlayedClient);
                challenged.score += 1;
                this.players.emitStatuses();
            }
            else {
                // penalize the challenger and let everyone know
                const challenger = this.players.get(client);
                challenger.score += 1;
                this.players.emitStatuses();
            }

            // clear the word and update everyone
            this.wordState.reset();

            // and move on
            this.players.advanceTurn();
        }, CHALLENGE_DURATION);
    }

    resetRequested(client) {
        // ensure that it was this client's turn
        if (!this.players.isPlayersTurn(client)) {
            // TODO: maybe scold the player if it's not their turn?
            return;
        }

        // penalize the loser
        const loser = this.players.get(this.players.lastPlayedClient);
        loser.score += 1;
        this.players.emitStatuses();

        // clear the word and update everyone
        this.wordState.reset();

        // whoever resets gets to continue their turn
    }
}

// boots up the server, etc.
// FIXME: should that be a side-effect of constructing this thing?
const game = new GhostGame(port);
