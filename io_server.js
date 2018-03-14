/* globals require */

const io = require('socket.io');
const shortid = require('short-id');
const words = require("word-list-json");

const port = 5005;
const MIN_OK_LENGTH = 3;

class GhostGame {
    constructor(port) {
        this.server = io();
        this.createGame();

        this.clients = [];
        this.currentWord = [];
        this.inDict = true;
        this.stillWinnable = true;
        this.curPlayerIdx = 0;

        this.lastPlayedClient = null;
    }

    createGame() {
        this.server.on('connection', (client) => {
            client.on('subscribeToGame', (name, avatar) => this.playerSubscribed(client, name, avatar));
            // this.playerSubscribed(client, name, avatar);
        });
    }

    start() {
        this.server.listen(port);
    }

    //
    // player lifecycle events
    //

    playerSubscribed(client, name, avatar) {
        // ---------------------------------------------------------------------------------
        // --- perform player init on subscription
        // ---------------------------------------------------------------------------------

        // const current_id = shortid.generate();
        const current_id = client.id;
        this.clients.push({
            id: current_id, name, avatar, client,
            score: 0
        });

        console.log(`client ${name} subscribed to the game w/ID ${current_id}`);
        console.log("sending current word: ", this.currentWord);

        // tell this player what the current word is
        client.emit('yourID', current_id);
        client.emit('currentPlayerChanged', this.clients[this.curPlayerIdx].id);
        this.sendUpdatedWord(client);

        // tell everyone there's a new player
        this.updatePlayerStatuses();


        // ---------------------------------------------------------------------------------
        // --- define player-sent events
        // ---------------------------------------------------------------------------------

        // --- player requests concatenation
        client.on('updateWord', (letter, isRightUpdate) => this.wordUpdated(client, letter, isRightUpdate));

        // --- player requests to reset the game
        client.on('requestReset', () => this.resetRequested(client));

        // --- player challenges the last submission
        client.on('challengeRequested', () => this.challengeRequested(client));

        // ---------------------------------------------------------------------------------
        // --- deal with disconnecting players, too
        // ---------------------------------------------------------------------------------

        // we need to remove them if they disconnect, too
        client.on('disconnect', () => this.playerDisconnected(client));
    }

    updatePlayerStatuses() {
        this.server.emit('updatePlayerStatuses', this.clients.map(player => ({
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            score: player.score
        })));

        // ensure that there's a valid player
        this.curPlayerIdx = this.curPlayerIdx % this.clients.length;
        if (this.clients[this.curPlayerIdx]) {
            this.server.emit('currentPlayerChanged', this.clients[this.curPlayerIdx].id);
        }
    }

    playerDisconnected(client) {
        const disconnected_player_idx = this.clients.findIndex((cur) => cur.client.id === client.id);
        const discPlayerID = this.clients[disconnected_player_idx].id;

        if (disconnected_player_idx >= 0) {
            console.log(`player ${discPlayerID} (${disconnected_player_idx + 1}) disconnected!`);
            this.clients.splice(disconnected_player_idx, 1);
            this.updatePlayerStatuses();

            // if there's anyone left...
            if (this.clients.length > 0) {
                // check if we need to update the current player (e.g. if the old one parted)
                const newCurPlayerIdx = (this.curPlayerIdx % this.clients.length);

                if (newCurPlayerIdx !== this.curPlayerIdx) {
                    this.curPlayerIdx = newCurPlayerIdx;
                    this.server.emit('currentPlayerChanged', this.clients[this.curPlayerIdx].id);
                }
            }
            else {
                console.log("Resetting due to last player parting, waiting...");

                // reset the game state and wait for more people
                this.currentWord = [];
                this.curPlayerIdx = 0;
            }
        }
    }


    //
    // player action handling
    //

    isPlayersTurn(client) {
        const thisPlayerIdx = this.clients.findIndex((cur) => cur.client.id === client.id);
        return thisPlayerIdx === this.curPlayerIdx;
    }

    wordUpdated(client, letter, isRightUpdate) {
        // ensure that it was this client's turn
        if (!this.isPlayersTurn(client)) {
            // TODO: maybe scold the player if it's not their turn?
            return;
        }

        // concatenate on the requested side
        if (isRightUpdate) {
            // add it with a key one more than the current
            const nextKey = this.currentWord.length > 0 ? this.currentWord[this.currentWord.length-1].key + 1 : 0;
            this.currentWord.push({ key: nextKey, letter });
        }
        else {
            // add it with a key one less than the current
            const nextKey = this.currentWord.length > 0 ? this.currentWord[0].key - 1 : 0;
            this.currentWord.unshift({ key: nextKey, letter });
        }

        // remember the last player who took a turn in case there's a challenge
        this.lastPlayedClient = client;

        this.sendUpdatedWord();
        this.advanceTurn();
    }

    challengeRequested(client) {
        // this can be sent by any player at any time; the 'offender' is the last player to submit a letter
        // it pauses the game to "consult the dictionary",
        // then penalizes the offender and restarts the game if the challenge goes through
        // or penalizes the challenger and continues if the challenge fails

        if (this.currentWord.length <= 0 || !this.lastPlayedClient || (this.lastPlayedClient === client && this.clients.length > 1)) {
            // there has to be a word played, a last-played client,
            // and you can't challenge yourself (unless you're playing by yourself)
            console.log("* challenge attempted, but didn't meet the requirements");
            return;
        }

        console.log("* challenge requested...");

        this.server.emit('challengeInProgress', this.lastPlayedClient.id, client.id);

        setTimeout(() => {
            const violated = !this.checkChallenge(GhostGame.getWordLetters(this.currentWord));
            console.log("...and resolved as ", violated);
            this.server.emit('challengeResolved', this.lastPlayedClient.id, client.id, violated);

            if (violated) {
                // clear the word and update everyone
                this.currentWord = [];

                // penalize the challenged player and let everyone know
                this.lastPlayedClient.score -= 1;
                this.updatePlayerStatuses();

                this.sendUpdatedWord();
                this.advanceTurn();
            }
            else {
                // penalize the challenger and let everyone know
                const challenger = this.clients.find((player) => player.client === client);
                challenger.score -= 1;
                this.updatePlayerStatuses();
            }
        }, 1000);
    }

    resetRequested(client) {
        // ensure that it was this client's turn
        if (!this.isPlayersTurn(client)) {
            // TODO: maybe scold the player if it's not their turn?
            return;
        }

        // give everyone points except the last player, if there was one
        this.clients.forEach((player) => {
            if (player.client !== this.lastPlayedClient) {
                player.score += 1;
            }
        });
        this.updatePlayerStatuses();

        // clear the word and update everyone
        this.currentWord = [];

        this.sendUpdatedWord();
        this.advanceTurn();
    }


    //
    // server status updates
    //

    static getWordLetters(currentWordSeq) {
        return currentWordSeq.length > 0 ? currentWordSeq.map(({ letter }) => letter).join("") : "";
    }

    getWordStatus(currentWordSeq) {
        const nextWord = GhostGame.getWordLetters(currentWordSeq);

        return {
            currentWord: currentWordSeq,
            inDict: nextWord.length > MIN_OK_LENGTH && words.includes(nextWord),
            stillWinnable: this.checkChallenge(nextWord)
        };
    }

    advanceTurn() {
        // advance the current player and let everyone know who the current player is
        this.curPlayerIdx = ((this.curPlayerIdx + 1) % this.clients.length);
        this.server.emit('currentPlayerChanged', this.clients[this.curPlayerIdx].id);
    }

    sendUpdatedWord(toClient) {
        console.log("new word: ", this.currentWord);

        const status = this.getWordStatus(this.currentWord);
        this.inDict = status.inDict;
        this.stillWinnable = status.stillWinnable;

        if (toClient) {
            toClient.emit('wordUpdated', status);
        }
        else {
            // FIXME: we should really only update subscribed users
            this.server.emit('wordUpdated', status, {for: 'everyone'});
        }
    }

    checkChallenge(challengeWord) {
        const subset = words.filter(word => word.indexOf(challengeWord) >= 0);

        if (subset.length === 0) {
            console.log(`no matching words!`);
        }
        else if (subset.length < 100) {
            console.log(subset);
        }
        else {
            console.log(`${subset.length} matching words`);
        }

        // check if the current word is a subword of any word in the dictionary
        return subset.length > 0;
    };
}

const game = new GhostGame(port);
game.start();

console.log('listening on port', port);