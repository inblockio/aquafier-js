#!/bin/bash
browserify ./src/apg-conv-api/web-exports.js > temp-bundle.js
terser temp-bundle.js -c -m > ./dist/apg-conv-api-bundle.js
rm temp-bundle.js
exit 0

