import words from "word-list-json";

export class WordState {
    constructor(server) {
        this.server = server;
        this.currentWord = [];
        this.inDict = true;
        this.stillWinnable = true;
    }

    static MIN_OK_LENGTH = 3;

    static getWordLetters(currentWordSeq) {
        return currentWordSeq.length > 0 ? currentWordSeq.map(({ letter }) => letter).join("") : "";
    }

    getWordStatus() {
        const nextWord = WordState.getWordLetters(this.currentWord);

        return {
            currentWord: this.currentWord,
            inDict: nextWord.length > WordState.MIN_OK_LENGTH && words.includes(nextWord),
            stillWinnable: this.checkChallenge(nextWord)
        };
    }

    belowMinLength() {
        return this.currentWord.length <= WordState.MIN_OK_LENGTH;
    }

    concatenate(letter, isRightUpdate) {
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

        this.sendUpdatedWord();
    }

    checkChallenge() {
        const challengeWord = WordState.getWordLetters(this.currentWord);
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
        return {
            violated: subset.length <= 0, words: subset
        };
    }

    reset() {
        this.currentWord = [];
        this.sendUpdatedWord();
    }

    sendUpdatedWord(toClient) {
        console.log("new word: ", this.currentWord);
        const status = this.getWordStatus();

        if (toClient) {
            toClient.emit('wordUpdated', status);
        }
        else {
            // FIXME: we should really only update subscribed users
            this.server.emit('wordUpdated', status, {for: 'everyone'});
        }
    }
}
