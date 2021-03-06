/* globals require, process */
const express = require('express');

const app = express();
// noinspection JSUnresolvedVariable
const port = process.env.PORT || 5000;

app.get('/api/hello', (req, res) => {
    res.send({ express: 'Hello From Express' });
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
