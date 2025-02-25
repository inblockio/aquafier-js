#!/bin/bash
browserify ./src/apg-api/web-exports.js > temp-bundle.js
terser temp-bundle.js -c -m > ./dist/apg-api-bundle.js
rm temp-bundle.js
exit 0

