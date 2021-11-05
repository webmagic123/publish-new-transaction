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
const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');
const app = express();

app.get('/', (req, res) => {
  res.status(200).send('Hello, world!').end();
});

// Start the server
const TOPIC_NAME = 'new_transfer';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '0uOGCRgiQKThWcxY0Pc14chod0zl79fH';
const PORT = process.env.PORT || 8080;
const pubsub = new PubSub();
let i = 0;

const refresh = async () => {
    console.log('----' + i);
    console.log('----' + (new Date()));

    i++;
    setTimeout(refresh, 10000);
}

app.listen(PORT, async () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
  // refresh();
});

const wss = new WebSocket(`wss://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`);

wss.on('open', () => {
    /* wss.send(JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_unsubscribe",
        id: 1,
        params: ["0xbbc2f4ae6b2017e742712b7e2f5b5d99"],
    })) */

    wss.send(JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_subscribe",
        params: ["newHeads"],
        id: 1
    }));
});

wss.on('message', async (data) => {
    const resultString = data.toString();
    const result = JSON.parse(resultString);
    const blockNum = result && result.params && result.params.result.number;
    console.log('block number - ' + blockNum);

    if (blockNum) {
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
    }
});

module.exports = app;
