import React from 'react';
import './App.css';

import GhostGame from './Game';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    render() {
        return (
            <div className="App">
                <GhostGame />
            </div>
        );
    }
}

export default App;
