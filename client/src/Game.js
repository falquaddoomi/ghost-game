import React from 'react';
import words from "word-list-json";

const MIN_OK_LENGTH = 3;

export default class GhostGame extends React.Component {
    constructor(props) {
        super(props);

        this.state = this.resetted;
    }

    resetted = {
        current: '',
        left: '',
        right: '',
        inDict: false,
        stillWinnable: true
    };

    edited = (event) => {
        const side = event.target.name;

        this.setState({
            [side === 'left_insert' ? 'left' : 'right']: event.target.value.toLocaleLowerCase()
        });
    };

    commitChange = () => {
        if (!this.state.left && !this.state.right) {
            return;
        }

        this.setState((pstate) => {
            const nextWord = pstate.left + pstate.current + pstate.right;
            return {
                current: nextWord,
                left: '',
                right: '',
                inDict: nextWord.length > MIN_OK_LENGTH && words.includes(nextWord),
                stillWinnable: this.challenge(nextWord)
            };
        });
    };

    checkEnter = (event) => {
        if (event.key === 'Enter') {
            this.commitChange();
        }
    };

    resetGame = () => {
        this.setState(this.resetted);
    };

    challenge = (challengeWord) => {
        const subset = words.filter(word => word.indexOf(challengeWord) >= 0);

        if (subset.length < 100) {
            console.log(subset);
        }
        else {
            console.log(`${subset.length} matching words`);
        }

        // check if the current word is a subword of any word in the dictionary
        return subset.length > 0;
    };

    render() {
        const {left, right, current, inDict, stillWinnable} = this.state;

        return (
            <div className="CenterModal">
                <div className="DictIndicator">
                    { current.length > 0
                        ? (
                            !inDict
                                ? <i>keep going, you're cool...{ stillWinnable || <i><br />(it's no longer winnable, though...)</i>}</i>
                                : <a target="_blank" href={`http://www.dictionary.com/browse/${current}`}>oops!</a>
                        )
                        : <i>enter a letter to begin</i>
                    }

                </div>

                <div className={`WordHolder CurrentSegment ${inDict ? 'error' : ''}`}>
                    {
                        !inDict && current.length > 0 && right === '' &&
                        <input type="text" name="left_insert" onChange={this.edited} onKeyPress={this.checkEnter} value={left} className="NewLetter WordStyler" maxLength={1} />
                    }

                    { current.split('').map((letter,idx) => <span key={idx} className="WordStyler">{letter}</span>) }

                    {
                        !inDict && left === '' &&
                        <input type="text" autoFocus={true} name="right_insert" onChange={this.edited} onKeyPress={this.checkEnter} value={right} className="NewLetter WordStyler" maxLength={1}/>
                    }
                </div>

                { !inDict
                    ? <button className={`Button Commit ${left || right ? 'ready' : ''}`} onClick={this.commitChange}>commit</button>
                    : <button className={`Button Reset`} onClick={this.resetGame}>reset</button>
                }

                <button id="HardReset" className="Button" onClick={this.resetGame}>h a r d r e s e t</button>
            </div>
        );
    }
}