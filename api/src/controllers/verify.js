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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = verifyController;
var file_utils_1 = require("../utils/file_utils");
var aqua_js_sdk_1 = require("aqua-js-sdk");
function verifyController(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            //Creates a new revision, validated against aqua-verifier-js-lib verifier.
            fastify.post('/verify', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var data, aquaTree, revision, revisionHash, fileObjects, aquafier, res, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            data = request.body;
                            aquaTree = data.aquaTree;
                            revision = data.revision;
                            revisionHash = data.revision_hash;
                            fileObjects = [];
                            if (data.fileObjects) {
                                fileObjects = data.fileObjects;
                            }
                            aquafier = new aqua_js_sdk_1.default();
                            return [4 /*yield*/, aquafier.verifyAquaTreeRevision(aquaTree, revision, revisionHash, fileObjects)];
                        case 1:
                            res = _a.sent();
                            if (res.isOk()) {
                                return [2 /*return*/, reply.code(200).send({
                                        data: res.data
                                    })];
                            }
                            else {
                                return [2 /*return*/, reply.code(417).send({
                                        data: res.data
                                    })];
                            }
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _a.sent();
                            request.log.error(error_1);
                            return [2 /*return*/, reply.code(500).send({
                                    error: 'Error processing AquaTree',
                                    details: error_1 instanceof Error ? error_1.message : 'Unknown error'
                                })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            fastify.post('/verify/file', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var aquafier, parts, aquaFileContent, files, _a, parts_1, parts_1_1, part, buffer, e_1_1, aquaFileObjects, aquaTree, verificationResults, error_2;
                var _b, e_1, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            aquafier = new aqua_js_sdk_1.default();
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 16, , 17]);
                            parts = request.parts();
                            aquaFileContent = null;
                            files = [];
                            _e.label = 2;
                        case 2:
                            _e.trys.push([2, 8, 9, 14]);
                            _a = true, parts_1 = __asyncValues(parts);
                            _e.label = 3;
                        case 3: return [4 /*yield*/, parts_1.next()];
                        case 4:
                            if (!(parts_1_1 = _e.sent(), _b = parts_1_1.done, !_b)) return [3 /*break*/, 7];
                            _d = parts_1_1.value;
                            _a = false;
                            part = _d;
                            if (!(part.type === 'file')) return [3 /*break*/, 6];
                            return [4 /*yield*/, (0, file_utils_1.streamToBuffer)(part.file)];
                        case 5:
                            buffer = _e.sent();
                            if (part.fieldname === 'aqua_file') {
                                aquaFileContent = buffer.toString('utf-8');
                            }
                            else {
                                // Store other files
                                files.push({
                                    fieldname: part.fieldname,
                                    filename: part.filename,
                                    buffer: buffer
                                });
                            }
                            _e.label = 6;
                        case 6:
                            _a = true;
                            return [3 /*break*/, 3];
                        case 7: return [3 /*break*/, 14];
                        case 8:
                            e_1_1 = _e.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 14];
                        case 9:
                            _e.trys.push([9, , 12, 13]);
                            if (!(!_a && !_b && (_c = parts_1.return))) return [3 /*break*/, 11];
                            return [4 /*yield*/, _c.call(parts_1)];
                        case 10:
                            _e.sent();
                            _e.label = 11;
                        case 11: return [3 /*break*/, 13];
                        case 12:
                            if (e_1) throw e_1.error;
                            return [7 /*endfinally*/];
                        case 13: return [7 /*endfinally*/];
                        case 14:
                            if (!aquaFileContent) {
                                return [2 /*return*/, reply.code(400).send({ error: 'No Aqua Json file uploaded' })];
                            }
                            if (files.length === 0) {
                                return [2 /*return*/, reply.code(400).send({ error: 'No files uploaded, please upload file next to aqua file' })];
                            }
                            aquaFileObjects = files.map(function (file) { return ({
                                fileContent: file.buffer.toString('utf-8'),
                                fileName: file.filename,
                                path: "./"
                            }); });
                            aquaTree = JSON.parse(aquaFileContent);
                            return [4 /*yield*/, aquafier.verifyAquaTree(aquaTree, aquaFileObjects)];
                        case 15:
                            verificationResults = _e.sent();
                            if (verificationResults.isOk()) {
                                return [2 /*return*/, reply.code(200).send({
                                        results: verificationResults.data,
                                        fileCount: files.length
                                    })];
                            }
                            else {
                                return [2 /*return*/, reply.code(417).send({
                                        results: verificationResults.data,
                                        fileCount: files.length
                                    })];
                            }
                            return [3 /*break*/, 17];
                        case 16:
                            error_2 = _e.sent();
                            request.log.error(error_2);
                            return [2 /*return*/, reply.code(500).send({ error: 'File upload failed', details: error_2.message })];
                        case 17: return [2 /*return*/];
                    }
                });
            }); });
            //Creates a new revision, validated against aqua-verifier-js-lib verifier.
            fastify.post('/verify/tree', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var data, aquaTree, fileObjects, aquafier, res, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            data = request.body;
                            aquaTree = data.aquaTree;
                            fileObjects = [];
                            if (data.fileObjects) {
                                fileObjects = data.fileObjects;
                            }
                            // Validate mandatory fields
                            if (!aquaTree) {
                                return [2 /*return*/, reply.code(400).send({
                                        error: 'Invalid AquaTree: Missing aquaTree object'
                                    })];
                            }
                            // Check mandatory nested fields
                            if (!aquaTree.revisions || Object.keys(aquaTree.revisions).length === 0) {
                                return [2 /*return*/, reply.code(400).send({
                                        error: 'Invalid AquaTree: Missing or empty revisions'
                                    })];
                            }
                            if (!aquaTree.file_index) {
                                return [2 /*return*/, reply.code(400).send({
                                        error: 'Invalid AquaTree: Missing file_index'
                                    })];
                            }
                            if (!aquaTree.tree || !aquaTree.tree.hash) {
                                return [2 /*return*/, reply.code(400).send({
                                        error: 'Invalid AquaTree: Missing tree or tree hash'
                                    })];
                            }
                            if (!aquaTree.treeMapping) {
                                return [2 /*return*/, reply.code(400).send({
                                        error: 'Invalid AquaTree: Missing treeMapping'
                                    })];
                            }
                            aquafier = new aqua_js_sdk_1.default();
                            return [4 /*yield*/, aquafier.verifyAquaTree(aquaTree, fileObjects)];
                        case 1:
                            res = _a.sent();
                            if (res.isOk()) {
                                return [2 /*return*/, reply.code(200).send({
                                        data: res.data
                                    })];
                            }
                            else {
                                return [2 /*return*/, reply.code(417).send({
                                        data: res.data
                                    })];
                            }
                            return [3 /*break*/, 3];
                        case 2:
                            error_3 = _a.sent();
                            request.log.error(error_3);
                            return [2 /*return*/, reply.code(500).send({
                                    error: 'Error processing AquaTree',
                                    details: error_3 instanceof Error ? error_3.message : 'Unknown error'
                                })];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
