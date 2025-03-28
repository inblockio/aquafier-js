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
exports.default = revisionsController;
var db_1 = require("../database/db");
var api_utils_1 = require("../utils/api_utils");
var revisions_utils_1 = require("../utils/revisions_utils");
// import { formatTimestamp } from '../utils/time_utils';
// import { AquaForms, FileIndex, Signature, WitnessEvent, Revision as RevisonDB } from 'prisma/client';
var aqua_js_sdk_1 = require("aqua-js-sdk");
function revisionsController(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            // fetch aqua tree from a revision hash
            fastify.post('/tree/data', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var latestRevisionHash, latestHashInDb, displayData, host, protocol, url, _a, anAquaTree, fileObject, sortedAquaTree, e_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            latestRevisionHash = request.body.latestRevisionHash;
                            return [4 /*yield*/, db_1.prisma.latest.findFirst({
                                    where: {
                                        hash: latestRevisionHash
                                        // user: session.address
                                    }
                                })];
                        case 1:
                            latestHashInDb = _b.sent();
                            if (latestHashInDb == null) {
                                return [2 /*return*/, reply.code(403).send({ message: "hash does not exist in latet revision", data: [] })];
                            }
                            displayData = [];
                            host = request.headers.host || "".concat((0, api_utils_1.getHost)(), ":").concat((0, api_utils_1.getPort)());
                            protocol = request.protocol || 'https';
                            url = "".concat(protocol, "://").concat(host);
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, (0, revisions_utils_1.createAquaTreeFromRevisions)(latestRevisionHash, url)
                                ////  console.log(`----> ${JSON.stringify(anAquaTree, null, 4)}`)
                            ];
                        case 3:
                            _a = _b.sent(), anAquaTree = _a[0], fileObject = _a[1];
                            sortedAquaTree = (0, aqua_js_sdk_1.OrderRevisionInAquaTree)(anAquaTree);
                            displayData.push({
                                aquaTree: sortedAquaTree,
                                fileObject: fileObject
                            });
                            return [3 /*break*/, 5];
                        case 4:
                            e_1 = _b.sent();
                            return [2 /*return*/, reply.code(500).send({ success: false, message: "Error ".concat(e_1) })];
                        case 5: return [2 /*return*/, reply.code(200).send({ data: displayData })];
                    }
                });
            }); });
            // save revision 
            fastify.post('/tree', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var nonce, session, revisionData, oldFilePubKeyHash, existData, filePubKeyHash, existingRevision, revisioValue, _a, _b, _c, _i, formItem, signature, error_1;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 17, , 18]);
                            nonce = request.headers['nonce'];
                            // Check if `nonce` is missing or empty
                            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                                return [2 /*return*/, reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' })];
                            }
                            return [4 /*yield*/, db_1.prisma.siweSession.findUnique({
                                    where: { nonce: nonce }
                                })];
                        case 1:
                            session = _d.sent();
                            if (!session) {
                                return [2 /*return*/, reply.code(403).send({ success: false, message: "Nounce  is invalid" })];
                            }
                            revisionData = request.body;
                            if (!revisionData.revision) {
                                return [2 /*return*/, reply.code(400).send({ success: false, message: "revision Data is required" })];
                            }
                            if (!revisionData.revisionHash) {
                                return [2 /*return*/, reply.code(400).send({ success: false, message: "revision hash is required" })];
                            }
                            if (!revisionData.revision.revision_type) {
                                return [2 /*return*/, reply.code(400).send({ success: false, message: "revision type is required" })];
                            }
                            if (!revisionData.revision.local_timestamp) {
                                return [2 /*return*/, reply.code(400).send({ success: false, message: "revision timestamp is required" })];
                            }
                            if (!revisionData.revision.previous_verification_hash) {
                                return [2 /*return*/, reply.code(400).send({ success: false, message: "previous revision hash  is required" })];
                            }
                            oldFilePubKeyHash = "".concat(session.address, "_").concat(revisionData.revision.previous_verification_hash);
                            return [4 /*yield*/, db_1.prisma.latest.findFirst({
                                    where: {
                                        hash: oldFilePubKeyHash
                                    }
                                })];
                        case 2:
                            existData = _d.sent();
                            if (existData == null) {
                                return [2 /*return*/, reply.code(401).send({ success: false, message: "previous  hash  not found" })];
                            }
                            filePubKeyHash = "".concat(session.address, "_").concat(revisionData.revisionHash);
                            return [4 /*yield*/, db_1.prisma.latest.update({
                                    where: {
                                        hash: oldFilePubKeyHash
                                    },
                                    data: {
                                        hash: filePubKeyHash
                                    }
                                })];
                        case 3:
                            _d.sent();
                            return [4 /*yield*/, db_1.prisma.revision.findUnique({
                                    where: {
                                        pubkey_hash: filePubKeyHash
                                    }
                                })];
                        case 4:
                            existingRevision = _d.sent();
                            if (existingRevision) {
                                // Handle the case where the revision already exists
                                // Maybe return an error or update the existing record
                                return [2 /*return*/, reply.code(409).send({ success: false, message: "Revision with this hash already exists" })];
                            }
                            // Insert new revision into the database
                            return [4 /*yield*/, db_1.prisma.revision.create({
                                    data: {
                                        pubkey_hash: filePubKeyHash,
                                        nonce: revisionData.revision.file_nonce || "",
                                        shared: [],
                                        // contract: revisionData.witness_smart_contract_address
                                        //     ? [{ address: revisionData.witness_smart_contract_address }]
                                        //     : [],
                                        previous: "".concat(session.address, "_").concat(revisionData.revision.previous_verification_hash),
                                        // children: {},
                                        local_timestamp: revisionData.revision.local_timestamp, // revisionData.revision.local_timestamp,
                                        revision_type: revisionData.revision.revision_type,
                                        verification_leaves: revisionData.revision.leaves || [],
                                    },
                                })];
                        case 5:
                            // Insert new revision into the database
                            _d.sent();
                            if (!(revisionData.revision.revision_type == "form")) return [3 /*break*/, 9];
                            revisioValue = Object.keys(revisionData);
                            _a = revisioValue;
                            _b = [];
                            for (_c in _a)
                                _b.push(_c);
                            _i = 0;
                            _d.label = 6;
                        case 6:
                            if (!(_i < _b.length)) return [3 /*break*/, 9];
                            _c = _b[_i];
                            if (!(_c in _a)) return [3 /*break*/, 8];
                            formItem = _c;
                            if (!formItem.startsWith("form_")) return [3 /*break*/, 8];
                            return [4 /*yield*/, db_1.prisma.aquaForms.create({
                                    data: {
                                        hash: filePubKeyHash,
                                        key: formItem,
                                        value: revisioValue[formItem],
                                        type: typeof revisioValue[formItem]
                                    }
                                })];
                        case 7:
                            _d.sent();
                            _d.label = 8;
                        case 8:
                            _i++;
                            return [3 /*break*/, 6];
                        case 9:
                            if (!(revisionData.revision.revision_type == "signature")) return [3 /*break*/, 11];
                            signature = "";
                            if (typeof revisionData.revision.signature == "string") {
                                signature = revisionData.revision.signature;
                            }
                            else {
                                signature = JSON.stringify(revisionData.revision.signature);
                            }
                            //todo consult dalmas if signature_public_key needs tobe stored
                            return [4 /*yield*/, db_1.prisma.signature.upsert({
                                    where: {
                                        hash: filePubKeyHash
                                    },
                                    update: {
                                        reference_count: {
                                            increment: 1
                                        }
                                    },
                                    create: {
                                        hash: filePubKeyHash,
                                        signature_digest: signature,
                                        signature_wallet_address: revisionData.revision.signature.wallet_address,
                                        signature_type: revisionData.revision.signature_type,
                                        signature_public_key: revisionData.revision.signature_public_key,
                                        reference_count: 1
                                    }
                                })];
                        case 10:
                            //todo consult dalmas if signature_public_key needs tobe stored
                            _d.sent();
                            _d.label = 11;
                        case 11:
                            if (!(revisionData.revision.revision_type == "witness")) return [3 /*break*/, 14];
                            // const witnessTimestamp = new Date();
                            return [4 /*yield*/, db_1.prisma.witnessEvent.create({
                                    data: {
                                        Witness_merkle_root: revisionData.revision.witness_merkle_root,
                                        Witness_timestamp: revisionData.revision.witness_timestamp.toString(),
                                        Witness_network: revisionData.revision.witness_network,
                                        Witness_smart_contract_address: revisionData.revision.witness_smart_contract_address,
                                        Witness_transaction_hash: revisionData.revision.witness_transaction_hash,
                                        Witness_sender_account_address: revisionData.revision.witness_sender_account_address
                                    }
                                })];
                        case 12:
                            // const witnessTimestamp = new Date();
                            _d.sent();
                            return [4 /*yield*/, db_1.prisma.witness.upsert({
                                    where: {
                                        hash: filePubKeyHash
                                    },
                                    update: {
                                        reference_count: {
                                            increment: 1
                                        }
                                    },
                                    create: {
                                        hash: filePubKeyHash,
                                        Witness_merkle_root: revisionData.revision.witness_merkle_root,
                                        reference_count: 1 // Starting with 1 since this is the first reference
                                    }
                                })];
                        case 13:
                            _d.sent();
                            _d.label = 14;
                        case 14:
                            if (!(revisionData.revision.revision_type == "link")) return [3 /*break*/, 16];
                            return [4 /*yield*/, db_1.prisma.link.create({
                                    data: {
                                        hash: filePubKeyHash,
                                        link_type: "aqua",
                                        link_require_indepth_verification: false,
                                        link_verification_hashes: revisionData.revision.link_verification_hashes,
                                        link_file_hashes: revisionData.revision.link_file_hashes,
                                        reference_count: 0
                                    }
                                })];
                        case 15:
                            _d.sent();
                            _d.label = 16;
                        case 16:
                            if (revisionData.revision.revision_type == "file") {
                                return [2 /*return*/, reply.code(500).send({
                                        message: "not implemented",
                                    })];
                            }
                            return [2 /*return*/, reply.code(200).send({
                                    success: true,
                                    message: "Revisions stored successfully",
                                })];
                        case 17:
                            error_1 = _d.sent();
                            request.log.error(error_1);
                            return [2 /*return*/, reply.code(500).send({ error: "Failed to process revisions" })];
                        case 18: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
