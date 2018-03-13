import io from 'socket.io-client';

const socket = io('http://localhost:5005');

export function subscribeToGame(playersUpdated, wordUpdated, myIDReceived, currentPlayerChanged, challengeInProgress, challengeResolved) {
    socket.on('playersUpdated', (players) => playersUpdated(players));
    socket.on('wordUpdated', (status) => wordUpdated(status));
    socket.on('yourID', (clientID) => myIDReceived(clientID));
    socket.on('currentPlayerChanged', (playerID) => currentPlayerChanged(playerID));

    socket.on('challengeInProgress', challengeInProgress);
    socket.on('challengeResolved', challengeResolved);


    socket.emit('subscribeToGame');
}

export function updateWord(nextWord, isRightUpdate) {
    socket.emit('updateWord', nextWord, isRightUpdate);
}

export function requestReset() {
    socket.emit('requestReset');
}

export function challengeRequested() {
    socket.emit('challengeRequested');
}
