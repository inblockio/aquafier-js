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
exports.default = explorerController;
var aqua_js_sdk_1 = require("aqua-js-sdk");
var db_1 = require("../database/db");
var file_utils_1 = require("../utils/file_utils");
var path_1 = require("path");
var jszip_1 = require("jszip");
var crypto_1 = require("crypto");
var util_1 = require("util");
var stream_1 = require("stream");
var fs = require("fs");
var revisions_utils_1 = require("../utils/revisions_utils");
var api_utils_1 = require("../utils/api_utils");
// import getStream from 'get-stream';
// Promisify pipeline
var pump = util_1.default.promisify(stream_1.pipeline);
function explorerController(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            fastify.post('/explorer_aqua_zip', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var nonce, session, aquafier, isMultipart, data, maxFileSize, genesis_name, chunks, _a, _b, _c, chunk, e_1_1, fileBuffer, zip, zipData, _d, _e, _f, _i, fileName, file, fileContent, aquaData, _g, _h, nameHash, aquaFileName, aquaFile, aquaFileDataText, aquaData_1, fileResult, allHashes, genesisHash, _j, allHashes_1, hashItem, revision, filepubkeyhash, fileAsset, fileContent_1, UPLOAD_DIR, uniqueFileName, filePath, fileData, existingFileIndex, _k, _l, _m, _o, fileName, file, fileContent, aquaTree, e_2, latest, host, protocol, url, displayData, error_1;
                var _p, e_1, _q, _r;
                return __generator(this, function (_s) {
                    switch (_s.label) {
                        case 0:
                            nonce = request.headers['nonce'];
                            // Check if `nonce` is missing or empty
                            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                                return [2 /*return*/, reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' })];
                            }
                            return [4 /*yield*/, db_1.prisma.siweSession.findUnique({
                                    where: { nonce: nonce }
                                })];
                        case 1:
                            session = _s.sent();
                            if (!session) {
                                return [2 /*return*/, reply.code(403).send({ success: false, message: "Nounce  is invalid" })];
                            }
                            aquafier = new aqua_js_sdk_1.default();
                            isMultipart = request.isMultipart();
                            if (!isMultipart) {
                                return [2 /*return*/, reply.code(400).send({ error: 'Expected multipart form data' })];
                            }
                            _s.label = 2;
                        case 2:
                            _s.trys.push([2, 48, , 49]);
                            return [4 /*yield*/, request.file()];
                        case 3:
                            data = _s.sent();
                            if (data == undefined || data.file === undefined) {
                                return [2 /*return*/, reply.code(400).send({ error: 'No file uploaded' })];
                            }
                            maxFileSize = 20 * 1024 * 1024;
                            if (data.file.bytesRead > maxFileSize) {
                                return [2 /*return*/, reply.code(413).send({ error: 'File too large. Maximum file size is 20MB' })];
                            }
                            genesis_name = "";
                            chunks = [];
                            _s.label = 4;
                        case 4:
                            _s.trys.push([4, 9, 10, 15]);
                            _a = true, _b = __asyncValues(data.file);
                            _s.label = 5;
                        case 5: return [4 /*yield*/, _b.next()];
                        case 6:
                            if (!(_c = _s.sent(), _p = _c.done, !_p)) return [3 /*break*/, 8];
                            _r = _c.value;
                            _a = false;
                            chunk = _r;
                            chunks.push(chunk);
                            _s.label = 7;
                        case 7:
                            _a = true;
                            return [3 /*break*/, 5];
                        case 8: return [3 /*break*/, 15];
                        case 9:
                            e_1_1 = _s.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 15];
                        case 10:
                            _s.trys.push([10, , 13, 14]);
                            if (!(!_a && !_p && (_q = _b.return))) return [3 /*break*/, 12];
                            return [4 /*yield*/, _q.call(_b)];
                        case 11:
                            _s.sent();
                            _s.label = 12;
                        case 12: return [3 /*break*/, 14];
                        case 13:
                            if (e_1) throw e_1.error;
                            return [7 /*endfinally*/];
                        case 14: return [7 /*endfinally*/];
                        case 15:
                            fileBuffer = Buffer.concat(chunks);
                            zip = new jszip_1.default();
                            return [4 /*yield*/, zip.loadAsync(fileBuffer)];
                        case 16:
                            zipData = _s.sent();
                            _d = zipData.files;
                            _e = [];
                            for (_f in _d)
                                _e.push(_f);
                            _i = 0;
                            _s.label = 17;
                        case 17:
                            if (!(_i < _e.length)) return [3 /*break*/, 36];
                            _f = _e[_i];
                            if (!(_f in _d)) return [3 /*break*/, 35];
                            fileName = _f;
                            if (!(fileName == 'aqua.json')) return [3 /*break*/, 35];
                            file = zipData.files[fileName];
                            return [4 /*yield*/, file.async('text')];
                        case 18:
                            fileContent = _s.sent();
                            aquaData = JSON.parse(fileContent);
                            _g = 0, _h = aquaData.name_with_hash;
                            _s.label = 19;
                        case 19:
                            if (!(_g < _h.length)) return [3 /*break*/, 34];
                            nameHash = _h[_g];
                            aquaFileName = "".concat(nameHash.name, ".aqua.json");
                            aquaFile = zipData.files[aquaFileName];
                            if (aquaFile == null || aquaFile == undefined) {
                                return [2 /*return*/, reply.code(500).send({ error: "Expected to find ".concat(aquaFileName, " as defined in aqua.json but file not found ") })];
                            }
                            return [4 /*yield*/, aquaFile.async('text')];
                        case 20:
                            aquaFileDataText = _s.sent();
                            aquaData_1 = JSON.parse(aquaFileDataText);
                            return [4 /*yield*/, db_1.prisma.file.findFirst({
                                    where: {
                                        file_hash: nameHash.hash
                                    }
                                })];
                        case 21:
                            fileResult = _s.sent();
                            allHashes = Object.keys(aquaData_1.revisions);
                            genesisHash = allHashes[0];
                            for (_j = 0, allHashes_1 = allHashes; _j < allHashes_1.length; _j++) {
                                hashItem = allHashes_1[_j];
                                revision = aquaData_1.revisions[hashItem];
                                if (revision.previous_verification_hash == null || revision.previous_verification_hash == undefined || revision.previous_verification_hash == "") {
                                    if (genesisHash != hashItem) {
                                        genesisHash = hashItem;
                                    }
                                    break;
                                }
                            }
                            filepubkeyhash = "".concat(session.address, "_").concat(genesisHash);
                            fileAsset = zipData.files[nameHash.name];
                            if (!(fileResult == null)) return [3 /*break*/, 26];
                            return [4 /*yield*/, fileAsset.async('nodebuffer')];
                        case 22:
                            fileContent_1 = _s.sent();
                            UPLOAD_DIR = (0, file_utils_1.getFileUploadDirectory)();
                            return [4 /*yield*/, fs.promises.mkdir(UPLOAD_DIR, { recursive: true })];
                        case 23:
                            _s.sent(); // Ensure directory exists
                            uniqueFileName = "".concat((0, crypto_1.randomUUID)(), "-").concat(path_1.default.basename(nameHash.name));
                            filePath = path_1.default.join(UPLOAD_DIR, uniqueFileName);
                            return [4 /*yield*/, fs.promises.writeFile(filePath, fileContent_1)];
                        case 24:
                            _s.sent();
                            fileData = {
                                content: filePath,
                                file_hash: nameHash.hash,
                                hash: filepubkeyhash,
                                reference_count: 1,
                            };
                            return [4 /*yield*/, db_1.prisma.file.create({
                                    data: fileData
                                })];
                        case 25:
                            //  console.log(`--> File Data ${JSON.stringify(fileData, null, 4)} `)
                            fileResult = _s.sent();
                            return [3 /*break*/, 28];
                        case 26: return [4 /*yield*/, db_1.prisma.file.update({
                                where: {
                                    hash: fileResult.hash
                                },
                                data: {
                                    reference_count: fileResult.reference_count + 1
                                }
                            })];
                        case 27:
                            _s.sent();
                            _s.label = 28;
                        case 28:
                            if (fileResult == null) {
                                return [2 /*return*/, reply.code(500).send({ success: false, message: "File index should not be null" })];
                            }
                            return [4 /*yield*/, db_1.prisma.fileIndex.findFirst({
                                    where: { file_hash: nameHash.hash },
                                })];
                        case 29:
                            existingFileIndex = _s.sent();
                            if (!existingFileIndex) return [3 /*break*/, 31];
                            existingFileIndex.hash = __spreadArray(__spreadArray([], existingFileIndex.hash, true), [filepubkeyhash], false);
                            return [4 /*yield*/, db_1.prisma.fileIndex.update({
                                    data: existingFileIndex,
                                    where: {
                                        id: existingFileIndex.id
                                    }
                                })];
                        case 30:
                            _s.sent();
                            return [3 /*break*/, 33];
                        case 31: return [4 /*yield*/, db_1.prisma.fileIndex.create({
                                data: {
                                    id: fileResult.hash,
                                    hash: [filepubkeyhash],
                                    file_hash: nameHash.hash,
                                    uri: nameHash.name,
                                    reference_count: 1
                                }
                            })];
                        case 32:
                            _s.sent();
                            _s.label = 33;
                        case 33:
                            _g++;
                            return [3 /*break*/, 19];
                        case 34: return [3 /*break*/, 36];
                        case 35:
                            _i++;
                            return [3 /*break*/, 17];
                        case 36:
                            _k = zipData.files;
                            _l = [];
                            for (_m in _k)
                                _l.push(_m);
                            _o = 0;
                            _s.label = 37;
                        case 37:
                            if (!(_o < _l.length)) return [3 /*break*/, 45];
                            _m = _l[_o];
                            if (!(_m in _k)) return [3 /*break*/, 44];
                            fileName = _m;
                            file = zipData.files[fileName];
                            _s.label = 38;
                        case 38:
                            _s.trys.push([38, 43, , 44]);
                            if (!fileName.endsWith(".aqua.json")) return [3 /*break*/, 41];
                            return [4 /*yield*/, file.async('text')];
                        case 39:
                            fileContent = _s.sent();
                            aquaTree = JSON.parse(fileContent);
                            // save the aqua tree 
                            return [4 /*yield*/, (0, revisions_utils_1.saveAquaTree)(aquaTree, session.address)];
                        case 40:
                            // save the aqua tree 
                            _s.sent();
                            return [3 /*break*/, 42];
                        case 41:
                            if (fileName == 'aqua.json') {
                                //ignored for now
                                //  console.log(`ignore aqua.json in second loop`)
                            }
                            else {
                                //  console.log(`ignore the asset  ${fileName}`)
                            }
                            _s.label = 42;
                        case 42: return [3 /*break*/, 44];
                        case 43:
                            e_2 = _s.sent();
                            return [2 /*return*/, reply.code(500).send({ error: "An error occured ".concat(e_2) })];
                        case 44:
                            _o++;
                            return [3 /*break*/, 37];
                        case 45: return [4 /*yield*/, db_1.prisma.latest.findMany({
                                where: {
                                    user: session.address
                                }
                            })];
                        case 46:
                            latest = _s.sent();
                            if (latest.length == 0) {
                                return [2 /*return*/, reply.code(200).send({ data: [] })];
                            }
                            host = request.headers.host || "".concat((0, api_utils_1.getHost)(), ":").concat((0, api_utils_1.getPort)());
                            protocol = request.protocol || 'https';
                            url = "".concat(protocol, "://").concat(host);
                            return [4 /*yield*/, (0, revisions_utils_1.fetchAquatreeFoUser)(url, latest)];
                        case 47:
                            displayData = _s.sent();
                            return [2 /*return*/, reply.code(200).send({ data: displayData })];
                        case 48:
                            error_1 = _s.sent();
                            request.log.error(error_1);
                            return [2 /*return*/, reply.code(500).send({ error: 'File upload failed' })];
                        case 49: return [2 /*return*/];
                    }
                });
            }); });
            fastify.post('/explorer_aqua_file_upload', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var nonce, session, aquafier, isMultipart, data, maxFileSize, fileBuffer, fileContent, aquaTreeWithFileObject, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
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
                            aquafier = new aqua_js_sdk_1.default();
                            isMultipart = request.isMultipart();
                            if (!isMultipart) {
                                return [2 /*return*/, reply.code(400).send({ error: 'Expected multipart form data' })];
                            }
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 6, , 7]);
                            return [4 /*yield*/, request.file()];
                        case 3:
                            data = _a.sent();
                            if (data == undefined || data.file === undefined) {
                                return [2 /*return*/, reply.code(400).send({ error: 'No file uploaded' })];
                            }
                            maxFileSize = 20 * 1024 * 1024;
                            if (data.file.bytesRead > maxFileSize) {
                                return [2 /*return*/, reply.code(413).send({ error: 'File too large. Maximum file size is 20MB' })];
                            }
                            return [4 /*yield*/, (0, file_utils_1.streamToBuffer)(data.file)];
                        case 4:
                            fileBuffer = _a.sent();
                            fileContent = fileBuffer.toString('utf-8');
                            aquaTreeWithFileObject = JSON.parse(fileContent);
                            // save the aqua tree 
                            return [4 /*yield*/, (0, revisions_utils_1.saveAquaTree)(aquaTreeWithFileObject, session.address)];
                        case 5:
                            // save the aqua tree 
                            _a.sent();
                            return [2 /*return*/, reply.code(200).send({ error: 'aqua tree saved successfully' })];
                        case 6:
                            error_2 = _a.sent();
                            request.log.error(error_2);
                            return [2 /*return*/, reply.code(500).send({ error: 'File upload failed' })];
                        case 7: return [2 /*return*/];
                    }
                });
            }); });
            // get file using file hash
            fastify.get('/explorer_files', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var nonce, session, latest, host, protocol, url, displayData;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
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
                            return [4 /*yield*/, db_1.prisma.latest.findMany({
                                    where: {
                                        user: session.address
                                    }
                                })];
                        case 2:
                            latest = _a.sent();
                            if (latest.length == 0) {
                                return [2 /*return*/, reply.code(200).send({ data: [] })];
                            }
                            host = request.headers.host || "".concat((0, api_utils_1.getHost)(), ":").concat((0, api_utils_1.getPort)());
                            protocol = request.protocol || 'https';
                            url = "".concat(protocol, "://").concat(host);
                            return [4 /*yield*/, (0, revisions_utils_1.fetchAquatreeFoUser)(url, latest)];
                        case 3:
                            displayData = _a.sent();
                            return [2 /*return*/, reply.code(200).send({ data: displayData })];
                    }
                });
            }); });
            fastify.post('/explorer_files', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var nonce, session, aquafier, isMultipart, data, maxFileSize, isForm, enableContent, enableScalar, isFormField, enableContentField, enableScalarField, fileBuffer, fileContent, fileSizeInBytes, fileObjectPar, host, protocol, res, resData, allHashes, genesisHash, _i, allHashes_2, hashItem, revision, revisionData, fileHash, urlPath, fullUrl, fileObject, filepubkeyhash, revisioValue, _a, _b, _c, _d, formItem, existingFile, existingFileIndex, UPLOAD_DIR, filename, filePath, fileCreation, error_3, logs, error_4;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            nonce = request.headers['nonce'];
                            // Check if `nonce` is missing or empty
                            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                                return [2 /*return*/, reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' })];
                            }
                            return [4 /*yield*/, db_1.prisma.siweSession.findUnique({
                                    where: { nonce: nonce }
                                })];
                        case 1:
                            session = _e.sent();
                            if (!session) {
                                return [2 /*return*/, reply.code(403).send({ success: false, message: "Nounce  is invalid" })];
                            }
                            aquafier = new aqua_js_sdk_1.default();
                            isMultipart = request.isMultipart();
                            if (!isMultipart) {
                                return [2 /*return*/, reply.code(400).send({ error: 'Expected multipart form data' })];
                            }
                            _e.label = 2;
                        case 2:
                            _e.trys.push([2, 23, , 24]);
                            return [4 /*yield*/, request.file()];
                        case 3:
                            data = _e.sent();
                            if (data == undefined || data.file === undefined) {
                                return [2 /*return*/, reply.code(400).send({ error: 'No file uploaded' })];
                            }
                            maxFileSize = 20 * 1024 * 1024;
                            if (data.file.bytesRead > maxFileSize) {
                                return [2 /*return*/, reply.code(413).send({ error: 'File too large. Maximum file size is 20MB' })];
                            }
                            isForm = false;
                            enableContent = false;
                            enableScalar = true;
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
                            return [4 /*yield*/, (0, file_utils_1.streamToBuffer)(data.file)];
                        case 4:
                            fileBuffer = _e.sent();
                            fileContent = fileBuffer.toString('utf-8');
                            fileSizeInBytes = fileBuffer.length;
                            fileObjectPar = {
                                fileContent: fileContent,
                                fileName: data.filename,
                                path: "./",
                                fileSize: fileSizeInBytes
                            };
                            host = request.headers.host || "".concat((0, api_utils_1.getHost)(), ":").concat((0, api_utils_1.getPort)());
                            protocol = request.protocol || 'https';
                            return [4 /*yield*/, aquafier.createGenesisRevision(fileObjectPar, isForm, enableContent, enableScalar)];
                        case 5:
                            res = _e.sent();
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
                            allHashes = Object.keys(resData.revisions);
                            genesisHash = allHashes[0];
                            for (_i = 0, allHashes_2 = allHashes; _i < allHashes_2.length; _i++) {
                                hashItem = allHashes_2[_i];
                                revision = resData.revisions[hashItem];
                                if (revision.previous_verification_hash == null || revision.previous_verification_hash == undefined || revision.previous_verification_hash == "") {
                                    if (genesisHash != hashItem) {
                                        genesisHash = hashItem;
                                    }
                                    break;
                                }
                            }
                            revisionData = resData.revisions[genesisHash];
                            fileHash = revisionData.file_hash;
                            if (!fileHash) {
                                return [2 /*return*/, reply.code(500).send({ error: "File hash missing from AquaTree response" })];
                            }
                            urlPath = "/files/".concat(fileHash);
                            fullUrl = "".concat(protocol, "://").concat(host).concat(urlPath);
                            fileObject = {
                                fileContent: fullUrl, // fileContent,
                                fileName: data.filename,
                                path: "./",
                                fileSize: fileSizeInBytes
                            };
                            _e.label = 6;
                        case 6:
                            _e.trys.push([6, 21, , 22]);
                            filepubkeyhash = "".concat(session.address, "_").concat(genesisHash);
                            return [4 /*yield*/, db_1.prisma.latest.create({
                                    data: {
                                        hash: filepubkeyhash,
                                        user: session.address,
                                    }
                                })];
                        case 7:
                            _e.sent();
                            // Insert new revision into the database
                            return [4 /*yield*/, db_1.prisma.revision.create({
                                    data: {
                                        pubkey_hash: filepubkeyhash,
                                        // user: session.address, // Replace with actual user identifier (e.g., request.user.id)
                                        nonce: revisionData.file_nonce || "",
                                        shared: [],
                                        // contract: revisionData.witness_smart_contract_address
                                        //     ? [{ address: revisionData.witness_smart_contract_address }]
                                        //     : [],
                                        previous: revisionData.previous_verification_hash || "",
                                        // children: {},
                                        local_timestamp: revisionData.local_timestamp,
                                        revision_type: revisionData.revision_type,
                                        verification_leaves: revisionData.leaves || [],
                                    },
                                })];
                        case 8:
                            // Insert new revision into the database
                            _e.sent();
                            if (!isForm) return [3 /*break*/, 12];
                            revisioValue = Object.keys(revisionData);
                            _a = revisioValue;
                            _b = [];
                            for (_c in _a)
                                _b.push(_c);
                            _d = 0;
                            _e.label = 9;
                        case 9:
                            if (!(_d < _b.length)) return [3 /*break*/, 12];
                            _c = _b[_d];
                            if (!(_c in _a)) return [3 /*break*/, 11];
                            formItem = _c;
                            if (!formItem.startsWith("form_")) return [3 /*break*/, 11];
                            return [4 /*yield*/, db_1.prisma.aquaForms.create({
                                    data: {
                                        hash: filepubkeyhash,
                                        key: formItem,
                                        value: revisioValue[formItem],
                                        type: typeof revisioValue[formItem]
                                    }
                                })];
                        case 10:
                            _e.sent();
                            _e.label = 11;
                        case 11:
                            _d++;
                            return [3 /*break*/, 9];
                        case 12: return [4 /*yield*/, db_1.prisma.file.findFirst({
                                where: { file_hash: fileHash },
                            })];
                        case 13:
                            existingFile = _e.sent();
                            return [4 /*yield*/, db_1.prisma.fileIndex.findFirst({
                                    where: { file_hash: fileHash },
                                })];
                        case 14:
                            existingFileIndex = _e.sent();
                            if (!existingFileIndex) return [3 /*break*/, 16];
                            existingFileIndex.reference_count = existingFileIndex.reference_count + 1;
                            existingFileIndex.hash = __spreadArray(__spreadArray([], existingFileIndex.hash, true), [genesisHash], false);
                            return [4 /*yield*/, db_1.prisma.fileIndex.update({
                                    data: existingFileIndex,
                                    where: {
                                        id: existingFileIndex.id
                                    }
                                })];
                        case 15:
                            _e.sent();
                            return [3 /*break*/, 20];
                        case 16:
                            UPLOAD_DIR = (0, file_utils_1.getFileUploadDirectory)();
                            filename = "".concat((0, crypto_1.randomUUID)(), "-").concat(data.filename);
                            filePath = path_1.default.join(UPLOAD_DIR, filename);
                            // Save the file
                            // await pump(data.file, fs.createWriteStream(filePath))
                            return [4 /*yield*/, fs.promises.writeFile(filePath, fileBuffer)];
                        case 17:
                            // Save the file
                            // await pump(data.file, fs.createWriteStream(filePath))
                            _e.sent();
                            return [4 /*yield*/, db_1.prisma.file.create({
                                    data: {
                                        hash: filepubkeyhash,
                                        file_hash: fileHash,
                                        content: filePath,
                                        reference_count: 1,
                                    }
                                })
                                //  console.log(JSON.stringify(fileCreation, null, 4))
                            ];
                        case 18:
                            fileCreation = _e.sent();
                            //  console.log(JSON.stringify(fileCreation, null, 4))
                            console.error("====We are through here: ", fileCreation.hash);
                            return [4 /*yield*/, db_1.prisma.fileIndex.create({
                                    data: {
                                        id: fileCreation.hash,
                                        hash: [filepubkeyhash],
                                        file_hash: fileHash,
                                        uri: data.filename,
                                        reference_count: 1
                                    }
                                })
                                //  console.log("Saved successfully")
                            ];
                        case 19:
                            _e.sent();
                            _e.label = 20;
                        case 20: return [3 /*break*/, 22];
                        case 21:
                            error_3 = _e.sent();
                            logs = [];
                            logs.push({
                                log: "Error saving genesis revision",
                                logType: aqua_js_sdk_1.LogType.ERROR
                            });
                            return [2 /*return*/, reply.code(500).send({
                                    data: res.data
                                })];
                        case 22: 
                        // Return success response
                        return [2 /*return*/, reply.code(200).send({
                                aquaTree: resData,
                                fileObject: fileObject
                            })];
                        case 23:
                            error_4 = _e.sent();
                            request.log.error(error_4);
                            return [2 /*return*/, reply.code(500).send({ error: 'File upload failed' })];
                        case 24: return [2 /*return*/];
                    }
                });
            }); });
            fastify.post('/explorer_delete_file', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var nonce, session, revisionDataPar, filepubkeyhash, revisionData, latestRevionData, aquaTreerevision, e_3, error_5;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
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
                            if (!session) {
                                return [2 /*return*/, reply.code(403).send({ success: false, message: "Nonce is invalid" })];
                            }
                            revisionDataPar = request.body;
                            if (!revisionDataPar.revisionHash) {
                                return [2 /*return*/, reply.code(400).send({ success: false, message: "revision hash is required" })];
                            }
                            filepubkeyhash = "".concat(session.address, "_").concat(revisionDataPar.revisionHash);
                            revisionData = [];
                            return [4 /*yield*/, db_1.prisma.revision.findFirst({
                                    where: {
                                        pubkey_hash: filepubkeyhash
                                    }
                                })];
                        case 2:
                            latestRevionData = _b.sent();
                            if (latestRevionData == null) {
                                return [2 /*return*/, reply.code(500).send({ success: false, message: "revision with hash ".concat(revisionDataPar.revisionHash, " not found in system") })];
                            }
                            revisionData.push(latestRevionData);
                            _b.label = 3;
                        case 3:
                            _b.trys.push([3, 6, , 7]);
                            if (!((latestRevionData === null || latestRevionData === void 0 ? void 0 : latestRevionData.previous) !== null && ((_a = latestRevionData === null || latestRevionData === void 0 ? void 0 : latestRevionData.previous) === null || _a === void 0 ? void 0 : _a.length) !== 0)) return [3 /*break*/, 5];
                            return [4 /*yield*/, (0, revisions_utils_1.findAquaTreeRevision)(latestRevionData === null || latestRevionData === void 0 ? void 0 : latestRevionData.previous)];
                        case 4:
                            aquaTreerevision = _b.sent();
                            revisionData.push.apply(revisionData, aquaTreerevision);
                            _b.label = 5;
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            e_3 = _b.sent();
                            return [2 /*return*/, reply.code(500).send({ success: false, message: "Error fetching a revision ".concat(JSON.stringify(e_3, null, 4)) })];
                        case 7:
                            _b.trys.push([7, 9, , 10]);
                            // Use Prisma transaction to ensure all or nothing execution
                            return [4 /*yield*/, db_1.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var revisionPubkeyHashes, witnesses, witnessRoots, _i, witnessRoots_1, root, remainingWitnesses, files, _loop_1, _a, files_1, file, _b, revisionData_1, item;
                                    return __generator(this, function (_c) {
                                        switch (_c.label) {
                                            case 0:
                                                revisionPubkeyHashes = revisionData.map(function (rev) { return rev.pubkey_hash; });
                                                // Step 1: First delete all entries in related tables that reference our revisions
                                                // We need to delete child records before parent records to avoid foreign key constraints
                                                // Delete AquaForms entries
                                                return [4 /*yield*/, tx.aquaForms.deleteMany({
                                                        where: {
                                                            hash: {
                                                                in: revisionPubkeyHashes
                                                            }
                                                        }
                                                    })];
                                            case 1:
                                                // Step 1: First delete all entries in related tables that reference our revisions
                                                // We need to delete child records before parent records to avoid foreign key constraints
                                                // Delete AquaForms entries
                                                _c.sent();
                                                // Delete Signature entries
                                                return [4 /*yield*/, tx.signature.deleteMany({
                                                        where: {
                                                            hash: {
                                                                in: revisionPubkeyHashes
                                                            }
                                                        }
                                                    })];
                                            case 2:
                                                // Delete Signature entries
                                                _c.sent();
                                                return [4 /*yield*/, tx.witness.findMany({
                                                        where: {
                                                            hash: {
                                                                in: revisionPubkeyHashes
                                                            }
                                                        }
                                                    })];
                                            case 3:
                                                witnesses = _c.sent();
                                                witnessRoots = witnesses.map(function (w) { return w.Witness_merkle_root; }).filter(Boolean);
                                                return [4 /*yield*/, tx.witness.deleteMany({
                                                        where: {
                                                            hash: {
                                                                in: revisionPubkeyHashes
                                                            }
                                                        }
                                                    })];
                                            case 4:
                                                _c.sent();
                                                _i = 0, witnessRoots_1 = witnessRoots;
                                                _c.label = 5;
                                            case 5:
                                                if (!(_i < witnessRoots_1.length)) return [3 /*break*/, 9];
                                                root = witnessRoots_1[_i];
                                                return [4 /*yield*/, tx.witness.count({
                                                        where: {
                                                            Witness_merkle_root: root
                                                        }
                                                    })];
                                            case 6:
                                                remainingWitnesses = _c.sent();
                                                if (!(remainingWitnesses === 0 && root)) return [3 /*break*/, 8];
                                                return [4 /*yield*/, tx.witnessEvent.delete({
                                                        where: {
                                                            Witness_merkle_root: root
                                                        }
                                                    })];
                                            case 7:
                                                _c.sent();
                                                _c.label = 8;
                                            case 8:
                                                _i++;
                                                return [3 /*break*/, 5];
                                            case 9: 
                                            // Delete Link entries
                                            return [4 /*yield*/, tx.link.deleteMany({
                                                    where: {
                                                        hash: {
                                                            in: revisionPubkeyHashes
                                                        }
                                                    }
                                                })];
                                            case 10:
                                                // Delete Link entries
                                                _c.sent();
                                                return [4 /*yield*/, tx.file.findMany({
                                                        where: {
                                                            hash: {
                                                                in: revisionPubkeyHashes
                                                            }
                                                        }
                                                    })];
                                            case 11:
                                                files = _c.sent();
                                                _loop_1 = function (file) {
                                                    var fileIndexEntries, _d, fileIndexEntries_1, fileIndex;
                                                    return __generator(this, function (_e) {
                                                        switch (_e.label) {
                                                            case 0: return [4 /*yield*/, tx.fileIndex.findMany({
                                                                    where: {
                                                                        hash: {
                                                                            has: file.hash
                                                                        }
                                                                    }
                                                                })];
                                                            case 1:
                                                                fileIndexEntries = _e.sent();
                                                                _d = 0, fileIndexEntries_1 = fileIndexEntries;
                                                                _e.label = 2;
                                                            case 2:
                                                                if (!(_d < fileIndexEntries_1.length)) return [3 /*break*/, 7];
                                                                fileIndex = fileIndexEntries_1[_d];
                                                                if (!((fileIndex.reference_count || 0) <= 1)) return [3 /*break*/, 4];
                                                                // If this is the last reference, delete the FileIndex entry
                                                                return [4 /*yield*/, tx.fileIndex.delete({
                                                                        where: {
                                                                            id: fileIndex.id
                                                                        }
                                                                    })];
                                                            case 3:
                                                                // If this is the last reference, delete the FileIndex entry
                                                                _e.sent();
                                                                return [3 /*break*/, 6];
                                                            case 4: 
                                                            // Otherwise, remove the reference and decrement the count
                                                            return [4 /*yield*/, tx.fileIndex.update({
                                                                    where: {
                                                                        id: fileIndex.id
                                                                    },
                                                                    data: {
                                                                        hash: fileIndex.hash.filter(function (h) { return h !== file.hash; }),
                                                                        reference_count: (fileIndex.reference_count || 0) - 1
                                                                    }
                                                                })];
                                                            case 5:
                                                                // Otherwise, remove the reference and decrement the count
                                                                _e.sent();
                                                                _e.label = 6;
                                                            case 6:
                                                                _d++;
                                                                return [3 /*break*/, 2];
                                                            case 7:
                                                                if (!((file.reference_count || 0) <= 1)) return [3 /*break*/, 9];
                                                                // If this is the last reference, delete the file
                                                                if (file.content) {
                                                                    try {
                                                                        fs.unlinkSync(file.content);
                                                                    }
                                                                    catch (er) {
                                                                        //  console.log("Error deleting file from filesystem:", er);
                                                                        // Continue even if file deletion fails
                                                                    }
                                                                }
                                                                return [4 /*yield*/, tx.file.delete({
                                                                        where: {
                                                                            hash: file.hash
                                                                        }
                                                                    })];
                                                            case 8:
                                                                _e.sent();
                                                                return [3 /*break*/, 11];
                                                            case 9: 
                                                            // Otherwise, decrement the reference count
                                                            return [4 /*yield*/, tx.file.update({
                                                                    where: {
                                                                        hash: file.hash
                                                                    },
                                                                    data: {
                                                                        reference_count: (file.reference_count || 0) - 1
                                                                    }
                                                                })];
                                                            case 10:
                                                                // Otherwise, decrement the reference count
                                                                _e.sent();
                                                                _e.label = 11;
                                                            case 11: return [2 /*return*/];
                                                        }
                                                    });
                                                };
                                                _a = 0, files_1 = files;
                                                _c.label = 12;
                                            case 12:
                                                if (!(_a < files_1.length)) return [3 /*break*/, 15];
                                                file = files_1[_a];
                                                return [5 /*yield**/, _loop_1(file)];
                                            case 13:
                                                _c.sent();
                                                _c.label = 14;
                                            case 14:
                                                _a++;
                                                return [3 /*break*/, 12];
                                            case 15: 
                                            // Step 2: Remove any references to our revisions from other revisions
                                            return [4 /*yield*/, tx.revision.updateMany({
                                                    where: {
                                                        previous: {
                                                            in: revisionPubkeyHashes
                                                        }
                                                    },
                                                    data: {
                                                        previous: null
                                                    }
                                                })];
                                            case 16:
                                                // Step 2: Remove any references to our revisions from other revisions
                                                _c.sent();
                                                // Step 3: Delete the latest entry - we need to do this before deleting revisions
                                                return [4 /*yield*/, tx.latest.deleteMany({
                                                        where: {
                                                            hash: {
                                                                in: revisionPubkeyHashes
                                                            }
                                                        }
                                                    })];
                                            case 17:
                                                // Step 3: Delete the latest entry - we need to do this before deleting revisions
                                                _c.sent();
                                                _b = 0, revisionData_1 = revisionData;
                                                _c.label = 18;
                                            case 18:
                                                if (!(_b < revisionData_1.length)) return [3 /*break*/, 21];
                                                item = revisionData_1[_b];
                                                return [4 /*yield*/, tx.revision.delete({
                                                        where: {
                                                            pubkey_hash: item.pubkey_hash
                                                        }
                                                    })];
                                            case 19:
                                                _c.sent();
                                                _c.label = 20;
                                            case 20:
                                                _b++;
                                                return [3 /*break*/, 18];
                                            case 21: return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 8:
                            // Use Prisma transaction to ensure all or nothing execution
                            _b.sent();
                            return [2 /*return*/, reply.code(200).send({ success: true, message: "File and revisions deleted successfully" })];
                        case 9:
                            error_5 = _b.sent();
                            console.error("Error in delete operation:", error_5);
                            return [2 /*return*/, reply.code(500).send({
                                    success: false,
                                    message: "Error deleting file: ".concat(error_5.message),
                                    details: error_5
                                })];
                        case 10: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
