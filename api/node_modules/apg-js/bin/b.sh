#!/usr/bin/env node
/* re-generate all grammar objects */
/* original names cannot be used or the attempt to replace files in use will cause an error */
gen=require("../src/apg/apg.js");
gen(["--in=./dist/abnf-for-sabnf-grammar.bnf", "--out=./src/apg-api/sabnf-grammar-b"]);
gen(["--in=./dist/scanner-grammar.bnf", "--out=./src/apg-api/scanner-grammar-b"]);
gen(["--in=./dist/replace-grammar.bnf", "--out=./src/apg-exp/replace-grammar-b"]);
