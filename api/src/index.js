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
// Import Fastify
var fastify_1 = require("fastify");
var cors_1 = require("@fastify/cors");
var dotenv = require("dotenv");
// Install first: npm install @fastify/multipart
var multipart_1 = require("@fastify/multipart");
var static_1 = require("@fastify/static");
var fs = require("fs");
// Import controllers
var user_1 = require("./controllers/user");
var auth_1 = require("./controllers/auth");
var index_1 = require("./controllers/index");
var version_1 = require("./controllers/version");
var files_1 = require("./controllers/files");
var explorer_1 = require("./controllers/explorer");
var verify_js_1 = require("./controllers/verify.js");
var file_utils_1 = require("./utils/file_utils");
var api_utils_1 = require("./utils/api_utils");
var revisions_1 = require("./controllers/revisions");
var share_1 = require("./controllers/share");
// Read host and port from environment variables
var HOST = (0, api_utils_1.getHost)();
var PORT = (0, api_utils_1.getPort)();
// Load environment variables
dotenv.config();
// Get the equivalent of __dirname in ES modules
// Define upload directory
var UPLOAD_DIR = (0, file_utils_1.getFileUploadDirectory)(); //process.env.UPLOAD_DIR ||  path.join(__dirname, '../../media/');
// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Create a Fastify instance
var fastify = (0, fastify_1.default)({ logger: true });
// Start the server
var start = function () { return __awaiter(void 0, void 0, void 0, function () {
    var err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                // Register the CORS plugin
                return [4 /*yield*/, fastify.register(cors_1.default, {
                        // Configure CORS options
                        origin: [
                            'http://localhost:5173',
                            'http://127.0.0.1:5173',
                            'http://localhost:3000',
                            'http://127.0.0.1:3000',
                            'http://localhost:3600',
                            'http://127.0.0.1:3600',
                            'https://aquafier.inblock.io',
                            'http://aquafier.inblock.io'
                        ], // Allow your React app origins
                        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                        credentials: true, // Allow cookies if needed
                        allowedHeaders: ['Content-Type', 'Authorization', 'nonce', 'metamask_address']
                    })];
            case 1:
                // Register the CORS plugin
                _a.sent();
                // Static handler
                return [4 /*yield*/, fastify.register(static_1.default, {
                        root: UPLOAD_DIR,
                        prefix: '/uploads/' // This will be the URL prefix to access files
                    })];
            case 2:
                // Static handler
                _a.sent();
                // Make sure you have the formbody parser plugin installed and registered
                fastify.register(Promise.resolve().then(function () { return require('@fastify/formbody'); }));
                // Register the plugin
                return [4 /*yield*/, fastify.register(multipart_1.default, {
                        limits: {
                            fileSize: 20 * 1024 * 1024 // 20MB - Adding this here as well for early rejection
                        }
                    })];
            case 3:
                // Register the plugin
                _a.sent();
                // Register controllers
                fastify.register(auth_1.default);
                fastify.register(user_1.default);
                fastify.register(index_1.default);
                fastify.register(version_1.default);
                fastify.register(files_1.default);
                fastify.register(explorer_1.default);
                fastify.register(verify_js_1.default);
                fastify.register(revisions_1.default);
                fastify.register(share_1.default);
                return [4 /*yield*/, fastify.listen({ port: PORT, host: HOST })];
            case 4:
                _a.sent();
                console.log("\n");
                console.log("====================================");
                console.log("🚀  AquaFier JS is running!");
                console.log("🌊  Website: https://aqua-protocol.org/");
                console.log("\uD83D\uDCE1  Listening on: http://".concat(HOST, ":").concat(PORT));
                console.log("====================================");
                console.log("\n");
                return [3 /*break*/, 6];
            case 5:
                err_1 = _a.sent();
                fastify.log.error(err_1);
                process.exit(1);
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); };
start();
