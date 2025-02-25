# JavaScript APG

## 4.4.0 Release Notes

Version 4.4.0 adds an option, `--typescript`, to the APG genererator which will
generate a `typescript`-compatible grammar object. The new script `regen` will
regenerate all the grammar objects in place anytime a change is made to any of
the ABNF grammars or if the generator is modified in any way.

## 4.3.0 Release Notes

Version 4.3.0 adds support for [apg-lite](https://github.com/ldthomas/apg-lite),
a new, light-weight version of the parsers built from this library.
The parser generator (`src/apg/apg.js`) has a new option, `--lite`, that will
generate grammar objects for the `apg-lite` parsers.
See the documentation for `apg-lite` for a complete description.

Version 4.3.0 makes no other changes to the previous version other than adding the new `apg-lite` feature.

## 4.2.1 Release Notes

Some ABNF grammar authors will use zero repetitions as an explicit empty string acceptor.
That is, one or the other of something like,

> char = %d33-127  
> empty1 = 0char  
> empty2 = 0"x"

Previous version of APG have rejected zero repititions as an empty string acceptor in favor of
the more intuitive and simpler to produce and simpler to process empty literal string

> empty = ""

`apg-js` version 4.2.0 and lower neglects to reject the zero repetitions form and, unfortunately,
it only sometimes actually accepts an empty string and sometimes fails.
Version 4.2.1 corrects this. Zero repetitions are allowed as explicit empty string acceptors and
are processed correctly.

Note, however, that zero repetitions is deprecated in that not all implementations of APG accept it
and that is it is slightly less efficient to implement.
Favored is the more streamlined empty literal string, `""`

## 4.2.0 Release Notes

Version 4.2.0 fixes some issues that have been causing problems for some bundlers and/or development tools.
`./src/apg-conv-api/converter.js`, `./src/apg-conv-api/transformers.js` and `./src/apg-lib/utilities.js` now refer
explicitly to the exported functions rather than relying on a saved copy of the `this` reference.
Also, use of the global `Buffer` object has been replaced with

> const { Buffer } = require('buffer');

and similary for `fs` and other global `node.js` properties, as recommended in the Node.js v20.5.1 documentation.
(_Note that `require('node:buffer')` causes problems with using `browerify` to bundle the libraries for web page use.
Removing the `node:` prefix solves that problem without causing problems with the bundle usage. Thanks to contributions
in the GitHub issue #13 thread for this suggestion._)

This updated version of `apg-js` has been tested with all of the examples in [apg-js-examples](https://github.com/ldthomas/apg-js-examples). All examples including the web page examples work as expected.

Also, all dependencies have been moved to devDependencies, removing the need for any globally installed packages.

## Overview

`apg-js` is the JavaScript version of APG, an ABNF Parser Generator. APG generates recursive-descent parsers directly from a superset of [ABNF](https://tools.ietf.org/html/rfc5234) (SABNF). Visit the [APG](https://sabnf.com/) website for a complete [overview](https://sabnf.com/overview/) of APG and SABNF.

`apg-js` obsoletes `apg-js2`, `apg-js2-lib`, `apg-js2-exp`, `apg-js2-api`, `apg-conv` and `apg-conv-api`. It changes them in two significant ways.

- It fixes a major problem in the attributes algorithm. Previous versions could fail on large grammars with many or large sets of mutually-recursive rules.
- It combines all of those packages into a single, easier to manage and maintain package.

## Documentation

This package is meant to assist other parsing applications and is normally not installed by itself, rather installed along with those other applications. For details and many examples of using of the libraries, both in `node.js` and browser web page applications, see `apg-js-examples` at [GitHub](https://github.com/ldthomas/apg-js-examples) or [npmjs](https://www.npmjs.com/package/apg-js-examples).
However, it does provide access to two, `node.js` applications, `apg` and `apg-conv`.

### Applications

`apg` is the parser generator. To see its usage run,

> `npm run apg -- --help`

`apg-conv` is a data conversion application. To see its usage run,

> `npm run apg-conv -- --help`

### Libraries

This package contains four libraries that can be used in either `node.js` or browser applications.
The libraries depend upon one another and the dependency tree looks like so:

```
apg-exp
|- apg-api
|-|- apg-lib
|-|-|- apg-conv-api
```

Each of the libraries is bundled for browser use along with some special styles.
Each bundle contains all of its dependencies explicitly. That is, if a browser application needs both `apg-api` and `apg-lib`, only the `apg-api` bundle need be scripted into the page.

The library and css bundles are in the `./dist` directory.

```
./dist/apg-exp-bundle.js
./dist/apg-api-bundle.js
./dist/apg-lib-bundle.js
./dist/apg-conv-api-bundle.js
./dist/apg-lib-bundle.css
```

The bundles can all be regenerated with the scripts:

```
npm run bundle-apg-conv-api
npm run bundle-apg-lib
npm run bundle-apg-api
npm run bundle-apg-exp
npm run bundle-apg-lib-css
```

### Code Documentation

The code documentation is in [docco](http://ashkenas.com/docco/) format and can be generated with:

```
npm run docco
```

The documentation is then at `./docs/index.html` or see it [here](https://sabnf.com/docs/apg-js/) at the [APG](https://sabnf.com/) website.
