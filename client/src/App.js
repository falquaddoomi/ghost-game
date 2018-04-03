import React from 'react';
import { TransitionGroup, CSSTransition } from "react-transition-group";
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Redirect, Link
} from "react-router-dom";

import './App.css';

import Profile from "./components/Profile";
import Game from './components/Game';

// import avatars from './data/avatars.json';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedAvatar: null,
            playerName: ''
        };
    }

    onNameUpdated = (newName) => {
        this.setState({ playerName: newName });
    };

    onAvatarUpdated = (avatar) => {
        this.setState({ selectedAvatar: avatar });
    };

    render() {
        return (
            <div className="App">
                <Router>
                    <Route
                        render={({ location }) => (
                            <div>
                                <Route exact path="/" render={() => <Redirect to="/profile" />} />

                                <TransitionGroup>
                                    <CSSTransition key={location.key} classNames="pagefade" timeout={300}>
                                        <Switch location={location}>
                                            <Route exact path="/profile" render={
                                                (props) => <Profile
                                                    nameUpdated={this.onNameUpdated}
                                                    avatarUpdated={this.onAvatarUpdated}
                                                    name={this.state.playerName}
                                                    avatar={this.state.selectedAvatar}
                                                    {...props}
                                                />}
                                            />

                                            <Route exact path="/game" render={
                                                (props) => <Game
                                                    name={this.state.playerName}
                                                    avatar={this.state.selectedAvatar}
                                                    {...props}
                                                />
                                            } />

                                            {/*
                                            without this `Route`, we would get errors
                                            during the initial transition from `/` to `/profile`
                                            */}
                                            <Route render={() => <div>Not Found</div>} />
                                        </Switch>
                                    </CSSTransition>
                                </TransitionGroup>
                            </div>
                        )}
                    />
                </Router>
            </div>
        );
    }
}

export default App;
