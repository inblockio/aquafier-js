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
exports.default = shareController;
var db_1 = require("../database/db");
// import { verifySiweMessage } from '../utils/auth_utils';
var aqua_js_sdk_1 = require("aqua-js-sdk");
var api_utils_1 = require("../utils/api_utils");
var revisions_utils_1 = require("../utils/revisions_utils");
function shareController(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            // get current session
            fastify.get('/share_data/:hash', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var hash, nonce, session, contractData, host, protocol, url, displayData, anAquaTree, fileObject, revision_pubkey_hash, sortedAquaTree, error_1;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            hash = request.params.hash;
                            if (hash == null || hash == undefined || hash == "") {
                                return [2 /*return*/, reply.code(406).send({ success: false, message: "hash not found in url" })];
                            }
                            nonce = request.headers['nonce'];
                            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                                return [2 /*return*/, reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' })];
                            }
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 8, , 9]);
                            return [4 /*yield*/, db_1.prisma.siweSession.findUnique({
                                    where: { nonce: nonce }
                                })];
                        case 2:
                            session = _c.sent();
                            if (!session) {
                                return [2 /*return*/, reply.code(401).send({ success: false, message: "Session not found" })];
                            }
                            // Check if session is expired
                            if (new Date(session.expirationTime) < new Date()) {
                                return [2 /*return*/, reply.code(401).send({ success: false, message: "Session expired" })];
                            }
                            return [4 /*yield*/, db_1.prisma.contract.findFirst({
                                    where: {
                                        hash: hash
                                    }
                                })];
                        case 3:
                            contractData = _c.sent();
                            if (contractData == null) {
                                return [2 /*return*/, reply.code(500).send({ success: false, message: "The aqua tree share contract does not exist" })];
                            }
                            if ((contractData === null || contractData === void 0 ? void 0 : contractData.receiver) != "everyone" && (contractData === null || contractData === void 0 ? void 0 : contractData.receiver) != session.address) {
                                return [2 /*return*/, reply.code(401).send({ success: false, message: "The aqua tree is not shared with you" })];
                            }
                            host = request.headers.host || "".concat((0, api_utils_1.getHost)(), ":").concat((0, api_utils_1.getPort)());
                            protocol = request.protocol || 'https';
                            url = "".concat(protocol, "://").concat(host);
                            displayData = [];
                            anAquaTree = void 0;
                            fileObject = void 0;
                            revision_pubkey_hash = "".concat(contractData.sender, "_").concat(contractData.latest);
                            if (!(contractData.option == "latest")) return [3 /*break*/, 5];
                            return [4 /*yield*/, (0, revisions_utils_1.fetchAquaTreeWithForwardRevisions)(revision_pubkey_hash, url)];
                        case 4:
                            _a = _c.sent(), anAquaTree = _a[0], fileObject = _a[1];
                            return [3 /*break*/, 7];
                        case 5: return [4 /*yield*/, (0, revisions_utils_1.createAquaTreeFromRevisions)(revision_pubkey_hash, url)];
                        case 6:
                            _b = _c.sent(), anAquaTree = _b[0], fileObject = _b[1];
                            _c.label = 7;
                        case 7:
                            sortedAquaTree = (0, aqua_js_sdk_1.OrderRevisionInAquaTree)(anAquaTree);
                            //  console.log(`Aqua tree ${JSON.stringify(sortedAquaTree)}`);
                            displayData.push({
                                aquaTree: sortedAquaTree,
                                fileObject: fileObject
                            });
                            // return aqua tree
                            return [2 /*return*/, displayData];
                        case 8:
                            error_1 = _c.sent();
                            console.error("Error fetching session:", error_1);
                            return [2 /*return*/, reply.code(500).send({ success: false, message: "Internal server error" })];
                        case 9: return [2 /*return*/];
                    }
                });
            }); });
            fastify.post('/share_data', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var _a, hash, recipient, latest, option, nonce, session, findRevision;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = request.body, hash = _a.hash, recipient = _a.recipient, latest = _a.latest, option = _a.option;
                            nonce = request.headers['nonce'];
                            // Check if `nonce` is missing or empty
                            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                                return [2 /*return*/, reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' })];
                            }
                            return [4 /*yield*/, db_1.prisma.siweSession.findUnique({
                                    where: { nonce: nonce }
                                })];
                        case 1:
                            session = _b.sent();
                            if (session == null) {
                                return [2 /*return*/, reply.code(403).send({ success: false, message: "Nounce  is invalid" })];
                            }
                            if (hash == null || hash == "" || recipient == null || recipient == "") {
                                return [2 /*return*/, reply.code(403).send({ success: false, message: "Hash and Recipient need to specified" })];
                            }
                            return [4 /*yield*/, db_1.prisma.revision.findFirst({
                                    where: {
                                        pubkey_hash: "".concat(session.address, "_").concat(latest)
                                    }
                                })];
                        case 2:
                            findRevision = _b.sent();
                            if (findRevision == null) {
                                return [2 /*return*/, reply.code(406).send({ success: false, message: "revision with hash  is invalid" })];
                            }
                            //validation to check owner is the one sharings
                            if (findRevision.pubkey_hash.split("_")[0] != session.address) {
                                return [2 /*return*/, reply.code(406).send({ success: false, message: "latest ".concat(latest, "  does not belong ").concat(session.address, " ") })];
                            }
                            //insert into contract
                            return [4 /*yield*/, db_1.prisma.contract.create({
                                    data: {
                                        hash: hash, //identifier
                                        receiver: recipient,
                                        sender: session.address,
                                        latest: latest,
                                        option: option,
                                        reference_count: 1
                                    }
                                })];
                        case 3:
                            //insert into contract
                            _b.sent();
                            return [2 /*return*/, reply.code(200).send({ success: true, message: "share contract created successfully." })];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
