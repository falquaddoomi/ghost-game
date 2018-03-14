import React from 'react';
import { TransitionGroup, CSSTransition } from "react-transition-group";
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Redirect
} from "react-router-dom";

import './App.css';

import Profile from "./components/Profile";
import Game from './components/Game';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            name: 'random-user-' + Math.random()*100,
            avatar: ''
        };
    }

    render() {
        return (
            <div className="App">
                <Router>
                    <Route
                        render={({ location }) => (
                            <div>
                                <Route
                                    exact
                                    path="/"
                                    render={() => <Redirect to="/profile" />}
                                />

                                {/* we could add a navbar here... */}

                                <div>
                                    <TransitionGroup>
                                        <CSSTransition key={location.key} classNames="fade" timeout={300}>
                                            <Switch location={location}>
                                                <Route exact path="/profile" component={Profile} />
                                                <Route exact path="/game" component={Game} />

                                                {/*
                                                without this `Route`, we would get errors
                                                during the initial transition from `/` to `/profile`
                                                */}
                                                <Route render={() => <div>Not Found</div>} />
                                            </Switch>
                                        </CSSTransition>
                                    </TransitionGroup>
                                </div>
                            </div>
                        )}
                    />
                </Router>
            </div>
        );
    }
}

export default App;
