#!/usr/bin/env node
const storage = require('./storage.js');

function print(obj) {
    if (obj) {
        console.log(JSON.stringify(obj, null, 2));
    }
}

// test code
let res = storage.get([]);
print(res);
storage.set(['2', '2-1'], 'v2-21');
storage.set(['2', '2-3'], 'v2-3');
storage.set(['3'], 'v3');

storage.delete(["3"], force = true);
