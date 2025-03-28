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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAquatreeFoUser = fetchAquatreeFoUser;
exports.saveAquaTree = saveAquaTree;
exports.fetchAquaTreeWithForwardRevisions = fetchAquaTreeWithForwardRevisions;
exports.estimateStringFileSize = estimateStringFileSize;
exports.createAquaTreeFromRevisions = createAquaTreeFromRevisions;
exports.findAquaTreeRevision = findAquaTreeRevision;
exports.FetchRevisionInfo = FetchRevisionInfo;
var aqua_js_sdk_1 = require("aqua-js-sdk");
var db_1 = require("../database/db");
var fs = require("fs");
var path_1 = require("path");
function fetchAquatreeFoUser(url, latest) {
    return __awaiter(this, void 0, void 0, function () {
        var displayData, _i, latest_1, revisonLatetsItem, _a, anAquaTree, fileObject, sortedAquaTree;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    displayData = [];
                    _i = 0, latest_1 = latest;
                    _b.label = 1;
                case 1:
                    if (!(_i < latest_1.length)) return [3 /*break*/, 4];
                    revisonLatetsItem = latest_1[_i];
                    return [4 /*yield*/, createAquaTreeFromRevisions(revisonLatetsItem.hash, url)
                        //  console.log(`----> ${JSON.stringify(anAquaTree, null, 4)}`)
                    ];
                case 2:
                    _a = _b.sent(), anAquaTree = _a[0], fileObject = _a[1];
                    sortedAquaTree = (0, aqua_js_sdk_1.OrderRevisionInAquaTree)(anAquaTree);
                    displayData.push({
                        aquaTree: sortedAquaTree,
                        fileObject: fileObject
                    });
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, displayData];
            }
        });
    });
}
function saveAquaTree(aquaTree, userAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var allHash, latestHash, lastPubKeyHash, _i, allHash_1, revisinHash, revisionData, pubKeyHash, pubKeyPrevious, revisioValue, _a, _b, _c, _d, formItem, signature, fileResult, existingFileIndex, fileHash, existingFile, existingFileIndex;
        var _e, _f, _g, _h, _j, _k;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    allHash = Object.keys(aquaTree.revisions);
                    latestHash = allHash[allHash.length - 1];
                    lastPubKeyHash = "".concat(userAddress, "_").concat(latestHash);
                    return [4 /*yield*/, db_1.prisma.latest.upsert({
                            where: {
                                hash: lastPubKeyHash
                            },
                            create: {
                                hash: lastPubKeyHash,
                                user: userAddress,
                            },
                            update: {
                                hash: lastPubKeyHash,
                                user: userAddress,
                            }
                        })];
                case 1:
                    _l.sent();
                    _i = 0, allHash_1 = allHash;
                    _l.label = 2;
                case 2:
                    if (!(_i < allHash_1.length)) return [3 /*break*/, 25];
                    revisinHash = allHash_1[_i];
                    revisionData = aquaTree.revisions[revisinHash];
                    pubKeyHash = "".concat(userAddress, "_").concat(revisinHash);
                    pubKeyPrevious = "";
                    if (revisionData.previous_verification_hash.length > 0) {
                        pubKeyPrevious = "".concat(userAddress, "_").concat(revisionData.previous_verification_hash);
                    }
                    // console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
                    // console.log(`revisinHash ${revisinHash} \n pubKeyPrevious ${pubKeyPrevious} --- \n Revision item ${JSON.stringify(revisionData)} `)
                    // Insert new revision into the database
                    return [4 /*yield*/, db_1.prisma.revision.upsert({
                            where: {
                                pubkey_hash: pubKeyHash
                            },
                            create: {
                                pubkey_hash: pubKeyHash,
                                // user: session.address, // Replace with actual user identifier (e.g., request.user.id)
                                nonce: (_e = revisionData.file_nonce) !== null && _e !== void 0 ? _e : "",
                                shared: [],
                                previous: pubKeyPrevious,
                                local_timestamp: revisionData.local_timestamp,
                                revision_type: revisionData.revision_type,
                                verification_leaves: (_f = revisionData.leaves) !== null && _f !== void 0 ? _f : [],
                            },
                            update: {
                                pubkey_hash: pubKeyHash,
                                // user: session.address, // Replace with actual user identifier (e.g., request.user.id)
                                nonce: (_g = revisionData.file_nonce) !== null && _g !== void 0 ? _g : "",
                                shared: [],
                                previous: pubKeyPrevious,
                                local_timestamp: revisionData.local_timestamp,
                                revision_type: revisionData.revision_type,
                                verification_leaves: (_h = revisionData.leaves) !== null && _h !== void 0 ? _h : [],
                            },
                        })];
                case 3:
                    // console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
                    // console.log(`revisinHash ${revisinHash} \n pubKeyPrevious ${pubKeyPrevious} --- \n Revision item ${JSON.stringify(revisionData)} `)
                    // Insert new revision into the database
                    _l.sent();
                    if (!(revisionData.revision_type == "form")) return [3 /*break*/, 7];
                    revisioValue = Object.keys(revisionData);
                    _a = revisioValue;
                    _b = [];
                    for (_c in _a)
                        _b.push(_c);
                    _d = 0;
                    _l.label = 4;
                case 4:
                    if (!(_d < _b.length)) return [3 /*break*/, 7];
                    _c = _b[_d];
                    if (!(_c in _a)) return [3 /*break*/, 6];
                    formItem = _c;
                    if (!formItem.startsWith("form_")) return [3 /*break*/, 6];
                    return [4 /*yield*/, db_1.prisma.aquaForms.upsert({
                            where: {
                                hash: pubKeyHash
                            },
                            create: {
                                hash: pubKeyHash,
                                key: formItem,
                                value: revisioValue[formItem],
                                type: typeof revisioValue[formItem]
                            },
                            update: {
                                hash: pubKeyHash,
                                key: formItem,
                                value: revisioValue[formItem],
                                type: typeof revisioValue[formItem]
                            }
                        })];
                case 5:
                    _l.sent();
                    _l.label = 6;
                case 6:
                    _d++;
                    return [3 /*break*/, 4];
                case 7:
                    if (!(revisionData.revision_type == "signature")) return [3 /*break*/, 9];
                    signature = "";
                    if (typeof revisionData.signature == "string") {
                        signature = revisionData.signature;
                    }
                    else {
                        signature = JSON.stringify(revisionData.signature);
                    }
                    //todo consult dalmas if signature_public_key needs tobe stored
                    return [4 /*yield*/, db_1.prisma.signature.upsert({
                            where: {
                                hash: pubKeyHash
                            },
                            update: {
                                reference_count: {
                                    increment: 1
                                }
                            },
                            create: {
                                hash: pubKeyHash,
                                signature_digest: signature,
                                signature_wallet_address: revisionData.signature.wallet_address,
                                signature_type: revisionData.signature_type,
                                signature_public_key: revisionData.signature_public_key,
                                reference_count: 1
                            }
                        })];
                case 8:
                    //todo consult dalmas if signature_public_key needs tobe stored
                    _l.sent();
                    _l.label = 9;
                case 9:
                    if (!(revisionData.revision_type == "witness")) return [3 /*break*/, 12];
                    return [4 /*yield*/, db_1.prisma.witness.upsert({
                            where: {
                                hash: pubKeyHash
                            },
                            update: {
                                reference_count: {
                                    increment: 1
                                }
                            },
                            create: {
                                hash: pubKeyHash,
                                Witness_merkle_root: revisionData.witness_merkle_root,
                                reference_count: 1 // Starting with 1 since this is the first reference
                            }
                        })];
                case 10:
                    _l.sent();
                    // const witnessTimestamp = new Date(!);
                    return [4 /*yield*/, db_1.prisma.witnessEvent.upsert({
                            where: {
                                Witness_merkle_root: revisionData.witness_merkle_root,
                            },
                            update: {
                                Witness_merkle_root: revisionData.witness_merkle_root,
                                Witness_timestamp: (_j = revisionData.witness_timestamp) === null || _j === void 0 ? void 0 : _j.toString(),
                                Witness_network: revisionData.witness_network,
                                Witness_smart_contract_address: revisionData.witness_smart_contract_address,
                                Witness_transaction_hash: revisionData.witness_transaction_hash,
                                Witness_sender_account_address: revisionData.witness_sender_account_address
                            },
                            create: {
                                Witness_merkle_root: revisionData.witness_merkle_root,
                                Witness_timestamp: (_k = revisionData.witness_timestamp) === null || _k === void 0 ? void 0 : _k.toString(),
                                Witness_network: revisionData.witness_network,
                                Witness_smart_contract_address: revisionData.witness_smart_contract_address,
                                Witness_transaction_hash: revisionData.witness_transaction_hash,
                                Witness_sender_account_address: revisionData.witness_sender_account_address
                            }
                        })];
                case 11:
                    // const witnessTimestamp = new Date(!);
                    _l.sent();
                    _l.label = 12;
                case 12:
                    if (!(revisionData.revision_type == "file")) return [3 /*break*/, 18];
                    if (revisionData.file_hash == null || revisionData.file_hash == undefined) {
                        throw Error("revision with hash ".concat(revisinHash, " is detected to be a file but file_hash is mising"));
                    }
                    return [4 /*yield*/, db_1.prisma.file.findFirst({
                            where: {
                                hash: {
                                    contains: revisinHash,
                                    mode: 'insensitive' // Case-insensitive matching
                                }
                            }
                        })];
                case 13:
                    fileResult = _l.sent();
                    if (fileResult == null) {
                        throw Error("file data should be in database but is not found.");
                    }
                    return [4 /*yield*/, db_1.prisma.file.updateMany({
                            where: {
                                OR: [
                                    { hash: fileResult.hash },
                                    { hash: { contains: fileResult.hash, mode: 'insensitive' } }
                                ]
                            },
                            data: {
                                reference_count: fileResult.reference_count + 1
                            }
                        })
                        // update  file index
                    ];
                case 14:
                    _l.sent();
                    return [4 /*yield*/, db_1.prisma.fileIndex.findFirst({
                            where: { id: fileResult.hash },
                        })];
                case 15:
                    existingFileIndex = _l.sent();
                    if (!existingFileIndex) return [3 /*break*/, 17];
                    existingFileIndex.hash = __spreadArray(__spreadArray([], existingFileIndex.hash, true), [pubKeyHash], false);
                    return [4 /*yield*/, db_1.prisma.fileIndex.update({
                            data: existingFileIndex,
                            where: {
                                id: existingFileIndex.id
                            }
                        })];
                case 16:
                    _l.sent();
                    return [3 /*break*/, 18];
                case 17: throw Error("file index data should be in database but is not found.");
                case 18:
                    if (!(revisionData.revision_type == "link")) return [3 /*break*/, 20];
                    //  console.log(`Revsion data ${JSON.stringify()}`)
                    return [4 /*yield*/, db_1.prisma.link.upsert({
                            where: {
                                hash: pubKeyHash,
                            },
                            update: {
                                hash: pubKeyHash,
                                link_type: "aqua",
                                link_require_indepth_verification: false,
                                link_verification_hashes: revisionData.link_verification_hashes,
                                link_file_hashes: revisionData.link_file_hashes,
                                reference_count: 0
                            },
                            create: {
                                hash: pubKeyHash,
                                link_type: "aqua",
                                link_require_indepth_verification: false,
                                link_verification_hashes: revisionData.link_verification_hashes,
                                link_file_hashes: revisionData.link_file_hashes,
                                reference_count: 0
                            }
                        })];
                case 19:
                    //  console.log(`Revsion data ${JSON.stringify()}`)
                    _l.sent();
                    _l.label = 20;
                case 20:
                    if (!(revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "")) return [3 /*break*/, 24];
                    fileHash = revisionData.file_hash;
                    if (fileHash == null) {
                        throw Error("revision with hash ".concat(revisinHash, " is detected to be a genesis but the file hash is null."));
                    }
                    return [4 /*yield*/, db_1.prisma.file.findFirst({
                            where: { file_hash: fileHash },
                        })];
                case 21:
                    existingFile = _l.sent();
                    return [4 /*yield*/, db_1.prisma.fileIndex.findFirst({
                            where: { file_hash: fileHash },
                        })];
                case 22:
                    existingFileIndex = _l.sent();
                    if (!existingFileIndex) return [3 /*break*/, 24];
                    existingFileIndex.hash = __spreadArray(__spreadArray([], existingFileIndex.hash, true), [allHash[0]], false);
                    return [4 /*yield*/, db_1.prisma.fileIndex.update({
                            data: existingFileIndex,
                            where: {
                                id: existingFileIndex.id
                            }
                        })];
                case 23:
                    _l.sent();
                    _l.label = 24;
                case 24:
                    _i++;
                    return [3 /*break*/, 2];
                case 25: return [2 /*return*/];
            }
        });
    });
}
function fetchAquaTreeWithForwardRevisions(latestRevisionHash, url) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, anAquaTree, fileObject;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, createAquaTreeFromRevisions(latestRevisionHash, url)
                    //now fetch forwad revision
                    // todo 
                ];
                case 1:
                    _a = _b.sent(), anAquaTree = _a[0], fileObject = _a[1];
                    //now fetch forwad revision
                    // todo 
                    return [2 /*return*/, [anAquaTree, fileObject]];
            }
        });
    });
}
/**
 * Estimates the size in bytes that a string would occupy if saved to a file
 * Uses UTF-8 encoding rules where ASCII chars take 1 byte and others take 2-4 bytes
 * @param str Input string to estimate size for
 * @returns Estimated size in bytes
 */
function estimateStringFileSize(str) {
    if (!str)
        return 0;
    return str.split('').reduce(function (acc, char) {
        var code = char.charCodeAt(0);
        // UTF-8 encoding rules:
        // 1 byte for ASCII (0-127)
        // 2 bytes for extended ASCII (128-2047)
        // 3 bytes for most other characters (2048-65535)
        // 4 bytes for remaining Unicode (65536+)
        if (code < 128)
            return acc + 1;
        if (code < 2048)
            return acc + 2;
        if (code < 65536)
            return acc + 3;
        return acc + 4;
    }, 0);
}
function createAquaTreeFromRevisions(latestRevisionHash, url) {
    return __awaiter(this, void 0, void 0, function () {
        var anAquaTree, revisionData, latestRevionData, pubKey, previousWithPubKey, aquaTreerevision, e_1, lastRevision, lastRevisionHash, files, fileObject, fileIndexes, _i, files_1, fileItem, stats, fileSizeInBytes, fullFilename, originalFilename, fileIndex, urlPath, fullUrl, _loop_1, _a, revisionData_1, revisionItem;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        return __generator(this, function (_p) {
            switch (_p.label) {
                case 0:
                    anAquaTree = {
                        revisions: {},
                        file_index: {}
                    };
                    revisionData = [];
                    return [4 /*yield*/, db_1.prisma.revision.findFirst({
                            where: {
                                pubkey_hash: latestRevisionHash, //`${session.address}_${}`
                            }
                        })];
                case 1:
                    latestRevionData = _p.sent();
                    if (latestRevionData == null) {
                        // return reply.code(500).send({ success: false, message: `` });
                        throw Error("revision with hash ".concat(latestRevionData, " not found in system"));
                    }
                    revisionData.push(latestRevionData);
                    _p.label = 2;
                case 2:
                    _p.trys.push([2, 5, , 6]);
                    console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%% previous ".concat(latestRevionData === null || latestRevionData === void 0 ? void 0 : latestRevionData.previous, " \n ").concat(JSON.stringify(latestRevionData, null, 4)));
                    pubKey = latestRevisionHash.split("_")[0];
                    previousWithPubKey = latestRevionData === null || latestRevionData === void 0 ? void 0 : latestRevionData.previous;
                    console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$  previous ".concat(previousWithPubKey, " "));
                    if (!((latestRevionData === null || latestRevionData === void 0 ? void 0 : latestRevionData.previous) !== null && ((_b = latestRevionData === null || latestRevionData === void 0 ? void 0 : latestRevionData.previous) === null || _b === void 0 ? void 0 : _b.length) !== 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, findAquaTreeRevision(previousWithPubKey)];
                case 3:
                    aquaTreerevision = _p.sent();
                    revisionData.push.apply(revisionData, aquaTreerevision);
                    _p.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    e_1 = _p.sent();
                    throw Error("Error fetching a revision ".concat(JSON.stringify(e_1, null, 4)));
                case 6:
                    lastRevision = revisionData[revisionData.length - 1];
                    lastRevisionHash = lastRevision.pubkey_hash.split("_")[1];
                    return [4 /*yield*/, db_1.prisma.file.findMany({
                            where: {
                                hash: {
                                    contains: lastRevisionHash,
                                    mode: 'insensitive' // Case-insensitive matching
                                }
                            }
                        })];
                case 7:
                    files = _p.sent();
                    fileObject = [];
                    fileIndexes = [];
                    if (!(files != null)) return [3 /*break*/, 11];
                    _i = 0, files_1 = files;
                    _p.label = 8;
                case 8:
                    if (!(_i < files_1.length)) return [3 /*break*/, 11];
                    fileItem = files_1[_i];
                    stats = fs.statSync(fileItem.content);
                    fileSizeInBytes = stats.size;
                    fullFilename = path_1.default.basename(fileItem.content) // Gets filename.ext from full path
                    ;
                    originalFilename = fullFilename.substring(fullFilename.indexOf('-') + 1) // Removes UUID-
                    ;
                    return [4 /*yield*/, db_1.prisma.fileIndex.findFirst({
                            where: {
                                file_hash: fileItem.file_hash
                            }
                        })
                        //  console.log("File index: ", fileIndex)
                    ];
                case 9:
                    fileIndex = _p.sent();
                    //  console.log("File index: ", fileIndex)
                    if (fileIndex == null) {
                        throw Error("Error file  ".concat(originalFilename, " not found in index"));
                    }
                    fileIndexes.push(fileIndex);
                    if (!fs.existsSync(fileItem.content)) {
                        // return reply.code(500).send({ success: false, message: `Error file  ${originalFilename} not found` });
                    }
                    urlPath = "/files/".concat(fileItem.file_hash);
                    fullUrl = "".concat(url).concat(urlPath);
                    fileObject.push({
                        fileContent: fullUrl, //fileContent.toString(),
                        fileName: fileIndex.uri,
                        path: "",
                        fileSize: fileSizeInBytes
                    });
                    _p.label = 10;
                case 10:
                    _i++;
                    return [3 /*break*/, 8];
                case 11:
                    _loop_1 = function (revisionItem) {
                        var hashOnly, previousHashOnly, revisionWithData, fileItem, fileContent, fileResult, revisionInfoData, fileFormData, _q, fileFormData_1, formItem, witnessData, signatureData, sig, linkData, hashSearchText, filesData, _r, aquaTreeLinked, fileObjectLinked, name_1, name_2;
                        return __generator(this, function (_s) {
                            switch (_s.label) {
                                case 0:
                                    hashOnly = revisionItem.pubkey_hash.split("_")[1];
                                    previousHashOnly = revisionItem.previous == null || revisionItem.previous == undefined || revisionItem.previous == "" ? "" : revisionItem.previous.split("_")[1];
                                    revisionWithData = {
                                        revision_type: revisionItem.revision_type,
                                        previous_verification_hash: previousHashOnly,
                                        local_timestamp: (_d = (_c = revisionItem.local_timestamp) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : "",
                                        "version": "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar",
                                    };
                                    if (revisionItem.has_content) {
                                        fileItem = files.find(function (e) { return e.hash == revisionItem.pubkey_hash; });
                                        fileContent = fs.readFileSync((_e = fileItem === null || fileItem === void 0 ? void 0 : fileItem.content) !== null && _e !== void 0 ? _e : "--error--", 'utf8');
                                        revisionWithData["content"] = fileContent;
                                    }
                                    if (!(revisionItem.revision_type == "file")) return [3 /*break*/, 2];
                                    return [4 /*yield*/, db_1.prisma.file.findFirst({
                                            where: {
                                                hash: {
                                                    contains: hashOnly,
                                                    mode: 'insensitive' // Case-insensitive matching
                                                }
                                            }
                                        })];
                                case 1:
                                    fileResult = _s.sent();
                                    if (fileResult == null) {
                                        throw Error("Revision file data  not found");
                                    }
                                    revisionWithData["file_nonce"] = (_f = revisionItem.nonce) !== null && _f !== void 0 ? _f : "--error--";
                                    revisionWithData["file_hash"] = (_g = fileResult.file_hash) !== null && _g !== void 0 ? _g : "--error--";
                                    return [3 /*break*/, 10];
                                case 2: return [4 /*yield*/, FetchRevisionInfo(revisionItem.pubkey_hash, revisionItem)];
                                case 3:
                                    revisionInfoData = _s.sent();
                                    if (revisionInfoData == null) {
                                        throw Error("Revision info not found");
                                    }
                                    if (!(revisionItem.revision_type == "form")) return [3 /*break*/, 4];
                                    fileFormData = revisionInfoData;
                                    for (_q = 0, fileFormData_1 = fileFormData; _q < fileFormData_1.length; _q++) {
                                        formItem = fileFormData_1[_q];
                                        revisionWithData[formItem.key] = formItem.value;
                                    }
                                    return [3 /*break*/, 10];
                                case 4:
                                    if (!(revisionItem.revision_type == "witness")) return [3 /*break*/, 5];
                                    witnessData = revisionInfoData;
                                    revisionWithData.witness_merkle_root = witnessData.Witness_merkle_root;
                                    revisionWithData.witness_timestamp = Number.parseInt(witnessData.Witness_timestamp);
                                    revisionWithData.witness_network = witnessData.Witness_network;
                                    revisionWithData.witness_smart_contract_address = witnessData.Witness_smart_contract_address;
                                    revisionWithData.witness_transaction_hash = witnessData.Witness_transaction_hash;
                                    revisionWithData.witness_sender_account_address = witnessData.Witness_sender_account_address;
                                    revisionWithData.witness_merkle_proof = []; // todo fix me from db 
                                    return [3 /*break*/, 10];
                                case 5:
                                    if (!(revisionItem.revision_type == "signature")) return [3 /*break*/, 6];
                                    signatureData = revisionInfoData;
                                    sig = signatureData.signature_digest;
                                    try {
                                        if ((_h = signatureData.signature_type) === null || _h === void 0 ? void 0 : _h.includes("did")) {
                                            sig = JSON.parse(signatureData.signature_digest);
                                        }
                                    }
                                    catch (error) {
                                        //  console.log("======================================")
                                        //  console.log(`Error fix me ${error} `)
                                    }
                                    revisionWithData.signature = sig;
                                    revisionWithData.signature_public_key = signatureData.signature_public_key;
                                    revisionWithData.signature_wallet_address = signatureData.signature_wallet_address;
                                    revisionWithData.signature_type = signatureData.signature_type;
                                    return [3 /*break*/, 10];
                                case 6:
                                    if (!(revisionItem.revision_type == "link")) return [3 /*break*/, 9];
                                    linkData = revisionInfoData;
                                    revisionWithData.link_type = (_j = linkData.link_type) !== null && _j !== void 0 ? _j : "";
                                    revisionWithData.link_verification_hashes = linkData.link_verification_hashes;
                                    revisionWithData.link_file_hashes = linkData.link_file_hashes;
                                    hashSearchText = linkData.link_verification_hashes[0];
                                    return [4 /*yield*/, db_1.prisma.fileIndex.findFirst({
                                            where: {
                                                id: {
                                                    contains: hashSearchText,
                                                    mode: 'insensitive' // Case-insensitive matching
                                                }
                                            }
                                        })];
                                case 7:
                                    filesData = _s.sent();
                                    if (filesData == null) {
                                        throw Error("File index with hash ".concat(hashSearchText, " not found "));
                                    }
                                    anAquaTree.file_index[hashSearchText] = (_k = filesData === null || filesData === void 0 ? void 0 : filesData.uri) !== null && _k !== void 0 ? _k : "--error--.";
                                    return [4 /*yield*/, createAquaTreeFromRevisions(filesData.id, url)];
                                case 8:
                                    _r = _s.sent(), aquaTreeLinked = _r[0], fileObjectLinked = _r[1];
                                    name_1 = (_l = Object.values(aquaTreeLinked.file_index)[0]) !== null && _l !== void 0 ? _l : "--error--";
                                    fileObject.push({
                                        fileContent: aquaTreeLinked,
                                        fileName: "".concat(name_1, ".aqua.json"),
                                        path: "",
                                        fileSize: estimateStringFileSize(JSON.stringify(aquaTreeLinked, null, 4))
                                    });
                                    fileObject.push.apply(fileObject, fileObjectLinked);
                                    return [3 /*break*/, 10];
                                case 9: throw Error("Revision of type ".concat(revisionItem.revision_type, " is unknown"));
                                case 10:
                                    // update file index for genesis revision 
                                    if (previousHashOnly == null || previousHashOnly.length == 0) {
                                        name_2 = fileIndexes.find(function (item) {
                                            // return item.hash.includes(revisionItem.pubkey_hash) || item.hash.map((item) => item.includes(hashOnly)).length > 0
                                            // Check if the full pubkey_hash is in the array
                                            if (item.hash.includes(revisionItem.pubkey_hash)) {
                                                return true;
                                            }
                                            // Check if any hash in the array contains the hashOnly part
                                            return item.hash.some(function (hashItem) { return hashItem.includes(hashOnly); });
                                        });
                                        //  console.log(`----------  name ${JSON.stringify(name, null, 4)}`)
                                        anAquaTree.file_index[hashOnly] = (_m = name_2 === null || name_2 === void 0 ? void 0 : name_2.uri) !== null && _m !== void 0 ? _m : "--error--.";
                                        revisionWithData["file_hash"] = (_o = name_2 === null || name_2 === void 0 ? void 0 : name_2.file_hash) !== null && _o !== void 0 ? _o : "--error--";
                                    }
                                    anAquaTree.revisions[hashOnly] = revisionWithData;
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _a = 0, revisionData_1 = revisionData;
                    _p.label = 12;
                case 12:
                    if (!(_a < revisionData_1.length)) return [3 /*break*/, 15];
                    revisionItem = revisionData_1[_a];
                    return [5 /*yield**/, _loop_1(revisionItem)];
                case 13:
                    _p.sent();
                    _p.label = 14;
                case 14:
                    _a++;
                    return [3 /*break*/, 12];
                case 15: 
                //  console.log(`YOU should see me ${JSON.stringify(anAquaTree, null, 4)}`)
                return [2 /*return*/, [anAquaTree, fileObject]];
            }
        });
    });
}
function findAquaTreeRevision(revisionHash) {
    return __awaiter(this, void 0, void 0, function () {
        var revisions, latestRevionData, pubKey, previousWithPubKey, aquaTreerevision;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    revisions = [];
                    return [4 /*yield*/, db_1.prisma.revision.findFirst({
                            where: {
                                pubkey_hash: revisionHash
                            }
                        })];
                case 1:
                    latestRevionData = _a.sent();
                    if (latestRevionData == null) {
                        throw new Error("Unable to get revision with hash ".concat(revisionHash));
                    }
                    revisions.push(latestRevionData);
                    if (!(latestRevionData === null || latestRevionData === void 0 ? void 0 : latestRevionData.previous)) return [3 /*break*/, 3];
                    pubKey = revisionHash.split("_")[0];
                    previousWithPubKey = latestRevionData === null || latestRevionData === void 0 ? void 0 : latestRevionData.previous;
                    if (!(latestRevionData === null || latestRevionData === void 0 ? void 0 : latestRevionData.previous.includes("_"))) {
                        previousWithPubKey = "".concat(pubKey, "_").concat(latestRevionData === null || latestRevionData === void 0 ? void 0 : latestRevionData.previous);
                    }
                    return [4 /*yield*/, findAquaTreeRevision(previousWithPubKey)];
                case 2:
                    aquaTreerevision = _a.sent();
                    revisions.push.apply(revisions, aquaTreerevision);
                    _a.label = 3;
                case 3: return [2 /*return*/, revisions];
            }
        });
    });
}
function FetchRevisionInfo(hash, revision) {
    return __awaiter(this, void 0, void 0, function () {
        var res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(revision.revision_type == "signature")) return [3 /*break*/, 2];
                    return [4 /*yield*/, db_1.prisma.signature.findFirst({
                            where: {
                                hash: hash
                            }
                        })];
                case 1: 
                //  console.log(`signature with hash ${hash}`)
                return [2 /*return*/, _a.sent()];
                case 2:
                    if (!(revision.revision_type == "witness")) return [3 /*break*/, 5];
                    return [4 /*yield*/, db_1.prisma.witness.findFirst({
                            where: {
                                hash: hash
                            }
                        })];
                case 3:
                    res = _a.sent();
                    if (res == null) {
                        throw new Error("witness is null ".concat(revision.revision_type));
                    }
                    return [4 /*yield*/, db_1.prisma.witnessEvent.findFirst({
                            where: {
                                Witness_merkle_root: res.Witness_merkle_root
                            }
                        })];
                case 4: return [2 /*return*/, _a.sent()];
                case 5:
                    if (!(revision.revision_type == "form")) return [3 /*break*/, 7];
                    return [4 /*yield*/, db_1.prisma.aquaForms.findMany({
                            where: {
                                hash: hash
                            }
                        })];
                case 6: return [2 /*return*/, _a.sent()];
                case 7:
                    if (!(revision.revision_type == "link")) return [3 /*break*/, 9];
                    return [4 /*yield*/, db_1.prisma.link.findFirst({
                            where: {
                                hash: hash
                            }
                        })];
                case 8: return [2 /*return*/, _a.sent()];
                case 9: 
                //  console.log(`type ${revision.revision_type} with hash ${hash}`)
                return [2 /*return*/, null
                    // throw new Error(`implment for ${revision.revision_type}`);
                ];
            }
        });
    });
}
