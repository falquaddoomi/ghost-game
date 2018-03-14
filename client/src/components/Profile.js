/* globals require */
import React from 'react';
import {withRouter} from "react-router-dom";

import avatars from '../data/avatars.json';

class Profile extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedAvatar: null,
            playerName: '',
            manualName: false
        }
    }

    selectAvatar = (avatar) => {
        this.setState(({ playerName, manualName }) => ({
            selectedAvatar: avatar,
            playerName: !manualName ? avatar.name : playerName
        }));
    };

    changePlayerName = (event) => {
        this.setState({
            playerName: event.target.value,
            manualName: !!event.target.value
        })
    };

    readyToGo = () => {
        return !!(this.state.selectedAvatar && this.state.playerName);
    };

    proceed = () => {
        if (this.readyToGo()) {
            this.props.history.push('/game', {
                playerName: this.state.playerName,
                avatarName: this.state.selectedAvatar.name
            });
        }
    };

    render() {
        const {selectedAvatar, playerName} = this.state;

        return (
            <div className="Screen">
                <div className="CenterModal">

                    <div style={styles.chosenPortrait}>
                    { selectedAvatar &&
                        <img width={50} height={50} src={require(`../${selectedAvatar.filename}`)} alt={selectedAvatar.name} />
                    }
                    </div>

                    <input type="text" value={playerName} onChange={this.changePlayerName} className="NameStyler" />

                    <div style={styles.avatarlist}>
                    {
                        Object.values(avatars).map(x => <a key={x.name} name={x.name} style={
                            {
                                ...styles.portraitFrame,
                                ...(selectedAvatar && selectedAvatar.name === x.name ? styles.selected : null)
                            }
                        } onClick={() => this.selectAvatar(x)}>
                            <div style={styles.portrait}>
                                <img width={40} height={40} src={require(`../${x.filename}`)} alt={x.name} />
                                <div style={{marginTop: '5px'}}>{x.name.split('-').join(' ')}</div>
                            </div>
                        </a>)
                    }
                    </div>

                    <button onClick={this.proceed} className={`Button ${this.readyToGo() ? 'ProfileSelected' : ''}`}>Go!</button>
                </div>
            </div>
        );
    }
}

const styles = {
    avatarlist: {
        width: '90%',
        height: '300px',
        border: 'solid 1px #ccc',
        borderRadius: '3px',
        padding: '5px',
        margin: '0.5em',
        display: 'flex',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto'
    },
    portraitFrame: {
        display: 'block',
        cursor: 'pointer',
        width: '60px',
        borderRadius: '5px',
        padding: '5px', margin: '5px',
        fontSize: '12px'
    },
    portrait: {
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    },
    selected: {
        backgroundColor: '#b3d9ff'
    },
    chosenPortrait: {
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        margin: '0.5em', width: '80px', height: '80px', borderRadius: '40px', backgroundColor: '#eee'
    }
};

export default withRouter(Profile);