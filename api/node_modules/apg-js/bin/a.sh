#!/bin/bash
# save copies of the original grammars prior to regeneration in case of failure
cp ./src/apg-api/scanner-grammar.js ./src/apg-api/scanner-grammar.js.save
cp ./src/apg-api/sabnf-grammar.js ./src/apg-api/sabnf-grammar.js.save
cp ./src/apg-exp/replace-grammar.js ./src/apg-exp/replace-grammar.js.save
