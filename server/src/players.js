export class PlayerList {
    constructor(server) {
        // used to send announcements to all the connected players
        this.server = server;

        this.players = {};
        this.curPlayer = null;
        this.lastPlayedClient = null;
    }

    add(client, name, avatar) {
        // if the client already exists, bail
        if (this.players[client.id] !== undefined) {
            return client.id;
        }

        this.players[client.id] = {
            id: client.id, joinTime: new Date(), client,
            name, avatar, score: 0
        };

        // if they're the first player, they're now the current player
        if (this.numPlayers() === 1 || !this.curPlayer) {
            this.curPlayer = this.players[client.id];
        }

        return client.id;
    }

    remove(client) {
        const discPlayerID = client.id;

        console.log(`player ${discPlayerID} disconnected!`);
        delete this.players[client.id];
        this.emitStatuses();

        // if there's anyone left...
        if (this.numPlayers() > 0) {
            const activePlayers = Object.values(this.players).filter(x => x.score < 5);
            const curPlayerIdx = activePlayers.findIndex(x => x === this.curPlayer);

            // check if we need to update the current player (e.g. if the old one parted)
            const newCurPlayerIdx = (curPlayerIdx % this.numPlayers());

            if (newCurPlayerIdx !== curPlayerIdx) {
                this.curPlayer = this.players[newCurPlayerIdx];

                if (this.curPlayer) {
                    this.server.emit('currentPlayerChanged', this.curPlayer.id);
                }
            }
        }
    }

    advanceTurn() {
        const activePlayers = Object.values(this.players).filter(x => x.score < 5);
        const curPlayerIdx = activePlayers.findIndex(x => x === this.curPlayer);

        this.curPlayer = activePlayers[(curPlayerIdx+1) % activePlayers.length];

        if (this.curPlayer) {
            // advance the current player and let everyone know who the current player is
            this.server.emit('currentPlayerChanged', this.curPlayer.id);
        }

        // FIXME: what do we do if the current player is invalid?
    }

    emitStatuses() {
        // FIXME: we can just send the player, but with the 'client' field ommited
        this.server.emit('updatePlayerStatuses', Object.values(this.players).map(player => ({
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            score: player.score
        })));
    }

    //
    // accessors
    //

    current() {
        return this.curPlayer;
    }

    /**
     * Returns the associated player data entry for a given socket.io client
     * @param client the socket.io client to look up
     */
    get(client) {
        return this.players[client.id];
    }

    numPlayers() {
        return Object.keys(this.players).length;
    }

    numActivePlayers() {
        return Object.values(this.players).filter(x => x.score < 5).length;
    }

    isPlayersTurn(client) {
        return this.players[client.id] === this.curPlayer;
    }

    empty() {
        return this.numPlayers() === 0;
    }
}
