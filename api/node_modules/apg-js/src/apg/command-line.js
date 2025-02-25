/*  *************************************************************************************
 *   copyright: Copyright (c) 2021 Lowell D. Thomas, all rights reserved
 *     license: BSD-2-Clause (https://opensource.org/licenses/BSD-2-Clause)
 *   ********************************************************************************* */
// This module processes the command line arguments into a completed configuration
// and returns a `config` object.
// It takes the  `node` command line arguments less the first two. e.g. `process.argv.slice(2)`
// and can be a free mix of keys and key/value pairs.
//
// Run<br>
// `npm run apg -- --help`<br>
// or<br>
// `./bin/apg.sh -- help`<br>
// to see all the options.
module.exports = function commandLine(args) {
  const fs = require('fs');
  const path = require('path');
  const { Buffer } = require('buffer');
  const converter = require('../apg-conv-api/converter');
  const helpScreen = function helpScreen(helpArgs) {
    let help = 'Usage: apg options\n';
    let options = '';
    helpArgs.forEach((arg) => {
      options += `${arg} `;
    });
    help += `options: ${options}\n`;
    help += '-h, --help                 : print this help screen\n';
    help += '-v, --version              : display version information\n';
    help += '-s, --strict               : only ABNF grammar (RFC 5234 & 7405) allowed, no Superset features\n';
    help += '-l, --lite                 : generate an apg-lite ES Modules grammar object*\n';
    help += '-t, --typescript           : generate a typescript grammar object*\n';
    help += '-i <path>[,<path>[,...]]   : input file(s)**\n';
    help += '--in=<path>[,<path>[,...]] : input file(s)**\n';
    help += '-o <path>                  : output filename***\n';
    help += '--out=<path>               : output filename***\n';
    help += '-n <function name>         : the grammar function name****\n';
    help += '--name=<function name>     : the grammar function name****\n';
    help += '--display-rules            : display the rule names\n';
    help += '--display-rule-dependencies: display => rules referenced <= rules referring to this rule\n';
    help += '--display-attributes       : display the attributes\n';
    help += '\n';
    help += 'Options are case insensitive.\n';
    help += '*   --typescript - a typescript grammar object is exported with\n';
    help += '        export function grammar(){}\n';
    help += '*   --lite - an apg-lite ES Modules grammar object is exported with\n';
    help += '        export default function grammar(){}\n';
    help += '    --typescript and --lite are mutually exclusive and\n';
    help += '    --typescript superceeds --lite if both are specified.\n';
    help += '    If neither are specified a CommonJS object is exported with.\n';
    help += '        module.exports = function grammar(){}\n';
    help += '**  Multiple input files allowed.\n';
    help += '    Multiple file names must be comma separated with no spaces.\n';
    help += '    File names from multiple input options are concatenated.\n';
    help += '    Content of all resulting input files is concatenated.\n';
    help += '*** Output file name is optional.\n';
    help += '    If no output file name is given, no parser is generated.\n';
    help += '    If the output file name is specified, the existing extension,\n';
    help += '    if any, is stripped and ".js" is added unless the --typescript option\n';
    help += '    is present in which case ".ts" is added.\n';
    help += '****If --name=fname is present, a named function is created\n';
    help += '      const fname = function grammar(){}\n';
    help += '    typically for scripting directly into a web page.\n';
    help += '    \n';
    return help;
  };
  const version = function version() {
    return 'JavaScript APG, version 4.4.0\nCopyright (C) 2024 Lowell D. Thomas, all rights reserved\n';
  };
  const STRICTL = '--strict';
  const STRICTS = '-s';
  const LITEL = '--lite';
  const LITES = '-l';
  const TYPEL = '--typescript';
  const TYPES = '-t';
  const HELPL = '--help';
  const HELPS = '-h';
  const VERSIONL = '--version';
  const VERSIONS = '-v';
  const DISPLAY_RULES = '--display-rules';
  const DISPLAY_RULE_DEPENDENCIES = '--display-rule-dependencies';
  const DISPLAY_ATTRIBUTES = '--display-attributes';
  const INL = '--in';
  const INS = '-i';
  const OUTL = '--out';
  const OUTS = '-o';
  const NAMEL = '--name';
  const NAMES = '-n';
  let inFilenames = [];
  const config = {
    help: '',
    version: '',
    error: '',
    strict: false,
    lite: false,
    typescript: false,
    noAttrs: false,
    displayRules: false,
    displayRuleDependencies: false,
    displayAttributes: false,
    src: null,
    outFilename: '',
    outfd: process.stdout.fd,
    funcName: null,
  };
  let key;
  let value;
  let i = 0;
  try {
    while (i < args.length) {
      const kv = args[i].split('=');
      if (kv.length === 2) {
        key = kv[0].toLowerCase();
        // eslint-disable-next-line prefer-destructuring
        value = kv[1];
      } else if (kv.length === 1) {
        key = kv[0].toLowerCase();
        value = i + 1 < args.length ? args[i + 1] : '';
      } else {
        throw new Error(`command line error: ill-formed option: ${args[i]}`);
      }
      switch (key) {
        case HELPL:
        case HELPS:
          config.help = helpScreen(args);
          return config;
        case VERSIONL:
        case VERSIONS:
          config.version = version();
          return config;
        case DISPLAY_RULES:
          config.displayRules = true;
          i += 1;
          break;
        case DISPLAY_RULE_DEPENDENCIES:
          config.displayRuleDependencies = true;
          i += 1;
          break;
        case DISPLAY_ATTRIBUTES:
          config.displayAttributes = true;
          i += 1;
          break;
        case STRICTL:
        case STRICTS:
          config.strict = true;
          i += 1;
          break;
        case LITEL:
        case LITES:
          config.lite = true;
          i += 1;
          break;
        case TYPEL:
        case TYPES:
          config.typescript = true;
          i += 1;
          break;
        case INL:
        case INS:
          if (!value) {
            throw new Error(`command line error: input file name has no value: ${args[i]}`);
          }
          inFilenames = inFilenames.concat(value.split(','));
          i += key === INL ? 1 : 2;
          break;
        case OUTL:
        case OUTS:
          if (!value) {
            throw new Error(`command line error: output file name has no valu: ${args[i]}`);
          }
          config.outFilename = value;
          i += key === OUTL ? 1 : 2;
          break;
        case NAMEL:
        case NAMES:
          if (!value) {
            throw new Error(`command line error: output file name has no value: ${args[i]}`);
          }
          config.funcName = value;
          i += key === NAMEL ? 1 : 2;
          break;
        default:
          throw new Error(`command line error: unrecognized arg: ${args[i]}`);
      }
    }

    /* get the SABNF input */
    if (inFilenames.length === 0) {
      throw new Error('command line error: no input file(s)');
    }

    let buf = Buffer.alloc(0);
    inFilenames.forEach((name) => {
      buf = Buffer.concat([buf, fs.readFileSync(name)]);
    });
    config.src = converter.decode('BINARY', buf);

    /* validate & open the output file, if any */
    config.outfd = null;
    if (config.outFilename) {
      const info = path.parse(config.outFilename);
      const ext = config.typescript ? 'ts' : 'js';
      if (info.dir) {
        config.outFilename = `${info.dir}/${info.name}.${ext}`;
      } else {
        config.outFilename = `${info.name}.${ext}`;
      }
      config.outfd = fs.openSync(config.outFilename, 'w');
    }
  } catch (e) {
    config.error = `CONFIG EXCEPTION: ${e.message}`;
    config.help = helpScreen(args);
  }
  return config;
};
