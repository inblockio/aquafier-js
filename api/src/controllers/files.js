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
exports.default = filesController;
var db_1 = require("../database/db");
var file_utils_js_1 = require("../utils/file_utils.js");
var aqua_js_sdk_1 = require("aqua-js-sdk");
var fs = require("fs");
function filesController(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            // get file using file hash
            fastify.get('/files/:fileHash', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var fileHash, nonce, session, file, fileIndex, revision, fileContent;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            fileHash = request.params.fileHash;
                            //  console.log(`Received fileHash: ${fileHash}`);
                            // file content from db
                            // return as a blob
                            if (!fileHash || fileHash.trim() === '') {
                                return [2 /*return*/, reply.code(401).send({ error: ' Missing or empty file hash' })];
                            }
                            nonce = request.headers['nonce'];
                            // Check if `nonce` is missing or empty
                            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                                return [2 /*return*/, reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' })];
                            }
                            return [4 /*yield*/, db_1.prisma.siweSession.findUnique({
                                    where: { nonce: nonce }
                                })];
                        case 1:
                            session = _a.sent();
                            if (!session) {
                                return [2 /*return*/, reply.code(403).send({ success: false, message: "Nounce  is invalid" })];
                            }
                            return [4 /*yield*/, db_1.prisma.file.findFirst({
                                    where: {
                                        file_hash: fileHash
                                    }
                                })];
                        case 2:
                            file = _a.sent();
                            if (file == null) {
                                return [2 /*return*/, reply.code(500).send({ success: false, message: "Error file  not found " })];
                            }
                            return [4 /*yield*/, db_1.prisma.fileIndex.findFirst({
                                    where: {
                                        file_hash: fileHash
                                    }
                                })];
                        case 3:
                            fileIndex = _a.sent();
                            if (fileIndex == null) {
                                return [2 /*return*/, reply.code(500).send({ success: false, message: "Error file uri  not found " })];
                            }
                            revision = db_1.prisma.revision.findFirst({
                                where: {
                                    OR: [
                                        { pubkey_hash: file.hash },
                                        {
                                            // Check if any of the fileIndex hashes are in the revision's pubkey_hash
                                            pubkey_hash: {
                                                in: fileIndex.hash
                                            }
                                        }
                                    ]
                                }
                            });
                            // If no matching revision is found, deny access
                            if (!revision) {
                                return [2 /*return*/, reply.code(403).send({ success: false, message: "Access denied: You don't have permission to access this file" })];
                            }
                            try {
                                fileContent = fs.readFileSync(file.content);
                                // Set appropriate headers
                                reply.header('Content-Type', 'application/octet-stream');
                                reply.header('Content-Disposition', "attachment; filename=\"".concat(fileIndex.uri, "\""));
                                // Send the file content as a response
                                return [2 /*return*/, reply.send(fileContent)];
                            }
                            catch (error) {
                                console.error('Error reading file:', error);
                                return [2 /*return*/, reply.code(500).send({ success: false, message: 'Error reading file content' })];
                            }
                            return [2 /*return*/];
                    }
                });
            }); });
            fastify.post('/file/object', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var aquafier, data, fileObject, isForm, enableContent, enableScalar, res, resData, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            aquafier = new aqua_js_sdk_1.default();
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            data = request.body;
                            fileObject = data.fileObject;
                            if (fileObject == undefined) {
                                return [2 /*return*/, reply.code(400).send({ error: 'No file uploaded' })];
                            }
                            if (fileObject.fileName == undefined || fileObject.fileContent == undefined) {
                                return [2 /*return*/, reply.code(400).send({ error: 'File name and content are required in file object' })];
                            }
                            isForm = true;
                            if (data.isForm) {
                                isForm = data.isForm;
                            }
                            enableContent = false;
                            if (data.enableContent) {
                                enableContent = data.enableContent;
                            }
                            enableScalar = false;
                            if (data.enableScalar) {
                                enableScalar = data.enableScalar;
                            }
                            return [4 /*yield*/, aquafier.createGenesisRevision(fileObject, isForm, enableContent, enableScalar)];
                        case 2:
                            res = _a.sent();
                            if (res.isErr()) {
                                res.data.push({
                                    log: "Error creating genesis revision",
                                    logType: aqua_js_sdk_1.LogType.ERROR
                                });
                                return [2 /*return*/, reply.code(500).send({
                                        logs: res.data
                                    })];
                            }
                            resData = res.data.aquaTree;
                            // Return success response
                            return [2 /*return*/, reply.code(200).send({
                                    aquaTree: resData,
                                })];
                        case 3:
                            error_1 = _a.sent();
                            request.log.error(error_1);
                            return [2 /*return*/, reply.code(500).send({ error: 'File upload failed' })];
                        case 4: return [2 /*return*/, { success: true }];
                    }
                });
            }); });
            fastify.post('/file/upload', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var aquafier, isMultipart, data, maxFileSize, isForm, enableContent, enableScalar, isFormField, enableContentField, enableScalarField, fileBuffer, fileContent, fileObject, res, resData, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            aquafier = new aqua_js_sdk_1.default();
                            isMultipart = request.isMultipart();
                            if (!isMultipart) {
                                return [2 /*return*/, reply.code(400).send({ error: 'Expected multipart form data' })];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 5, , 6]);
                            return [4 /*yield*/, request.file()];
                        case 2:
                            data = _a.sent();
                            if (data == undefined || data.file === undefined) {
                                return [2 /*return*/, reply.code(400).send({ error: 'No file uploaded' })];
                            }
                            maxFileSize = 20 * 1024 * 1024;
                            if (data.file.bytesRead > maxFileSize) {
                                return [2 /*return*/, reply.code(413).send({ error: 'File too large. Maximum file size is 20MB' })];
                            }
                            isForm = false;
                            enableContent = false;
                            enableScalar = false;
                            //  console.log("Data fields", data.fields);
                            if (data.fields.isForm) {
                                isFormField = data.fields.isForm;
                                // If it's a single field
                                isForm = isFormField.value === 'true';
                            }
                            // Same for enableContent
                            if (data.fields.enableContent) {
                                enableContentField = data.fields.enableContent;
                                enableContent = enableContentField.value === 'true';
                            }
                            // Same for enableContent
                            if (data.fields.enableScalar) {
                                enableScalarField = data.fields.enableScalar;
                                enableScalar = enableScalarField.value === 'true';
                            }
                            return [4 /*yield*/, (0, file_utils_js_1.streamToBuffer)(data.file)];
                        case 3:
                            fileBuffer = _a.sent();
                            fileContent = fileBuffer.toString('utf-8');
                            fileObject = {
                                fileContent: fileContent,
                                fileName: data.filename,
                                path: "./",
                            };
                            return [4 /*yield*/, aquafier.createGenesisRevision(fileObject, isForm, enableContent, enableScalar)];
                        case 4:
                            res = _a.sent();
                            if (res.isErr()) {
                                res.data.push({
                                    log: "Error creating genesis revision",
                                    logType: aqua_js_sdk_1.LogType.ERROR
                                });
                                return [2 /*return*/, reply.code(500).send({
                                        logs: res.data
                                    })];
                            }
                            resData = res.data.aquaTree;
                            // Return success response
                            return [2 /*return*/, reply.code(200).send({
                                    aquaTree: resData,
                                })];
                        case 5:
                            error_2 = _a.sent();
                            request.log.error(error_2);
                            return [2 /*return*/, reply.code(500).send({ error: 'File upload failed' })];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
