#!/bin/bash
browserify ./src/apg-lib/web-exports.js > temp-bundle.js
terser temp-bundle.js -c -m > ./dist/apg-lib-bundle.js
rm temp-bundle.js
exit 0

