"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileUploadDirectory = exports.isTextFileProbability = exports.isTextFile = exports.streamToBuffer = void 0;
var path_1 = require("path");
var url_1 = require("url");
var getFileUploadDirectory = function () {
    // Get the equivalent of __dirname in ES modules
    var __filename = (0, url_1.fileURLToPath)(import.meta.url);
    var __dirname = path_1.default.dirname(__filename);
    return process.env.UPLOAD_DIR || path_1.default.join(__dirname, '../../media');
};
exports.getFileUploadDirectory = getFileUploadDirectory;
var streamToBuffer = function (stream) { return __awaiter(void 0, void 0, void 0, function () {
    var chunks;
    return __generator(this, function (_a) {
        chunks = [];
        return [2 /*return*/, new Promise(function (resolve, reject) {
                stream.on('data', function (chunk) { return chunks.push(chunk); });
                stream.on('end', function () { return resolve(Buffer.concat(chunks)); });
                stream.on('error', reject);
            })];
    });
}); };
exports.streamToBuffer = streamToBuffer;
var extensions = function () {
    return [
        // Plain text
        '.txt', '.text', '.log', '.me', '.readme',
        // Source code files
        '.js', '.jsx', '.ts', '.tsx', '.java', '.c', '.cpp', '.h', '.hpp',
        '.cs', '.py', '.rb', '.php', '.go', '.rs', '.swift', '.kt', '.scala',
        '.groovy', '.pl', '.pm', '.t', '.sh', '.bash', '.zsh', '.fish',
        '.ps1', '.psm1', '.bat', '.cmd', '.asm', '.s', '.lua', '.r', '.d',
        '.dart', '.m', '.mm', '.f', '.f90', '.f95', '.for', '.tcl', '.vb',
        '.vbs', '.elm', '.ex', '.exs', '.erl', '.hrl', '.clj', '.cljs',
        '.lisp', '.lsp', '.ml', '.mli', '.fs', '.fsx', '.v', '.zig',
        // Web development
        '.html', '.htm', '.css', '.scss', '.sass', '.less', '.svg', '.xml',
        '.xsl', '.xslt', '.json', '.yaml', '.yml', '.toml', '.ini', '.env',
        '.htaccess', '.jsx', '.tsx',
        // Document formats
        '.md', '.markdown', '.rst', '.rtf', '.tex', '.latex', '.wiki',
        '.csv', '.tsv', '.ics', '.vcf',
        // Configuration files
        '.conf', '.config', '.cfg', '.properties', '.plist', '.rc',
        '.gitignore', '.gitconfig', '.gitattributes', '.editorconfig',
        '.dockerignore', '.npmrc', '.babelrc', '.eslintrc', '.prettierrc',
        '.stylelintrc',
        // Data exchange
        '.sql', '.graphql', '.gql', '.proto',
        // Misc
        '.diff', '.patch'
    ];
};
// Determine if the file is a text file based on filename extension
var isTextFile = function (filename) {
    var ext = path_1.default.extname(filename).toLowerCase();
    return extensions().includes(ext);
};
exports.isTextFile = isTextFile;
var isTextFileProbability = function (buffer, filename) { return __awaiter(void 0, void 0, void 0, function () {
    var textExtensions, ext, i, printableChars, sampleSize, i, byte, textRatio;
    return __generator(this, function (_a) {
        textExtensions = extensions();
        ext = path_1.default.extname(filename).toLowerCase();
        // Known text extension
        if (textExtensions.includes(ext)) {
            return [2 /*return*/, true];
        }
        // For unknown extensions, try to detect if it's text by examining the buffer
        // Check if buffer contains any null bytes (common in binary files)
        for (i = 0; i < Math.min(buffer.length, 1024); i++) {
            if (buffer[i] === 0) {
                return [2 /*return*/, false]; // Contains null byte, likely binary
            }
        }
        printableChars = 0;
        sampleSize = Math.min(buffer.length, 1024);
        for (i = 0; i < sampleSize; i++) {
            byte = buffer[i];
            if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
                printableChars++;
            }
        }
        textRatio = printableChars / sampleSize;
        return [2 /*return*/, textRatio > 0.9]; // If more than 90% is printable ASCII, consider it text
    });
}); };
exports.isTextFileProbability = isTextFileProbability;
