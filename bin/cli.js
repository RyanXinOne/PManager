#!/usr/bin/env node
const storage = require('./storage.js');

function print(obj) {
    if (obj) {
        console.log(JSON.stringify(obj, null, 2));
    }
}

// test code
let res = storage.get('2');
print(res);
storage.set(['3', '3-1'], 'v3-1');
