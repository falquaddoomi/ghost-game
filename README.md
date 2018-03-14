# Ghost Game

A version of the game "ghost". Written in React (via create-react-app) + socket.io with a node backend.

# Prerequisites

[Node](https://nodejs.org/en/download/) (which includes the node package manager, npm), yarn (`npm install -g yarn`).

# Installation, Usage

Check out, run `yarn install`. Run the client and server in one process via `npm run-script dev`. You can also
run the server and/or client separately via `npm run-script server` or `npm run-script client`, respectively.

# Project Structure

The server is mostly implemented in `io_server.js` (`express_server.js` is currently a stub that will be filled out later). The client is in the `client/` subdirectory, but is otherwise laid out like a standard [create-react-app](https://github.com/facebook/create-react-app) application.
