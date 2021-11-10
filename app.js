// Copyright 2017 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const WebSocket = require('ws');
const ReconnectingWebSocket = require('reconnecting-websocket');
const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');
const app = express();

// Start the server
const TOPIC_NAME = 'new_transfer';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '0uOGCRgiQKThWcxY0Pc14chod0zl79fH';
const PORT = process.env.PORT || 8080;
const pubsub = new PubSub();

app.listen(PORT, async () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

app.get('/', (req, res) => {
    res.status(200).send('Hello, world!').end();
});

const wss = new ReconnectingWebSocket(`wss://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`, null, {
    debug: true,
    reconnectInterval: 3000,
    WebSocket: WebSocket,
});

wss.onopen = function () {
    /* wss.send(JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_unsubscribe",
        id: 1,
        params: ["0xbbc2f4ae6b2017e742712b7e2f5b5d99"],
    })) */
    console.log('socket connected ---');

    wss.send(JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_subscribe",
        params: ["newHeads"],
        id: 1
    }));
};

wss.onmessage = async function (data) {
    const resultString = data.data.toString();
    const result = JSON.parse(resultString);
    const blockNum = result && result.params && result.params.result.number;

    if (blockNum) {
        console.log('block number - ' + blockNum);
        const topic = pubsub.topic(TOPIC_NAME);

        const messageObject = {
            data: {
                message: blockNum,
            },
        };
        const messageBuffer = Buffer.from(JSON.stringify(messageObject), 'utf8');

        // Publishes a message
        try {
            await topic.publish(messageBuffer);
        } catch (err) {
            console.error(err);
        }
    } else {
        console.log('--- raw result ---' + resultString);
    }
};

wss.onclose = function () {
    console.log('connection closed ---');
};

wss.onerror = function (error) {
    console.log('error ---');
    console.log(JSON.stringify(error));
};

wss.onconnecting = function () {
    console.log('connectiong ---');
};

module.exports = app;
