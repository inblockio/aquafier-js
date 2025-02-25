#!/bin/bash
browserify ./src/apg-exp/web-exports.js > temp-bundle.js
terser temp-bundle.js -c -m > ./dist/apg-exp-bundle.js
rm temp-bundle.js
exit 0

