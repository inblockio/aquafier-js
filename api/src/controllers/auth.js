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
exports.default = authController;
var db_1 = require("../database/db");
var auth_utils_1 = require("../utils/auth_utils");
function authController(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            // get current session
            fastify.get('/session', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var nonce, session, error_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            nonce = (_a = request.query.nonce) !== null && _a !== void 0 ? _a : "";
                            if (!nonce) {
                                return [2 /*return*/, { success: false, message: "Nonce is required" }];
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, db_1.prisma.siweSession.findUnique({
                                    where: { nonce: nonce }
                                })];
                        case 2:
                            session = _b.sent();
                            if (!session) {
                                return [2 /*return*/, reply.code(404).send({ success: false, message: "Session not found" })];
                            }
                            // Check if session is expired
                            if (new Date(session.expirationTime) < new Date()) {
                                return [2 /*return*/, reply.code(401).send({ success: false, message: "Session expired" })];
                            }
                            return [2 /*return*/, {
                                    success: true,
                                    session: {
                                        address: session.address,
                                        nonce: session.nonce,
                                        issued_at: session.issuedAt,
                                        expiration_time: session.expirationTime
                                    }
                                }];
                        case 3:
                            error_1 = _b.sent();
                            console.error("Error fetching session:", error_1);
                            return [2 /*return*/, reply.code(500).send({ success: false, message: "Internal server error" })];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            //logout
            fastify.delete('/session', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var nonce, error_2;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            nonce = (_a = request.query.nonce) !== null && _a !== void 0 ? _a : "";
                            if (!nonce) {
                                return [2 /*return*/, reply.code(400).send({ success: false, message: "Nonce is required" })];
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, db_1.prisma.siweSession.delete({
                                    where: { nonce: nonce }
                                })];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, { success: true, message: "Session deleted successfully" }];
                        case 3:
                            error_2 = _b.sent();
                            console.error("Error deleting session:", error_2);
                            return [2 /*return*/, reply.code(500).send({ success: false, message: "Internal server error" })];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            // login
            fastify.post('/session', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var _a, message, signature, logs, siweData, nonce, session, user, settingsData, defaultData, error_3;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = request.body, message = _a.message, signature = _a.signature;
                            logs = [];
                            logs.push("Received SIWE message: ".concat(message));
                            logs.push("Received signature: ".concat(signature));
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 8, , 9]);
                            return [4 /*yield*/, (0, auth_utils_1.verifySiweMessage)(message, signature)];
                        case 2:
                            siweData = _b.sent();
                            // logs.push(`Verified Ethereum address: ${address}`);
                            if (siweData === undefined || !siweData.isValid) {
                                logs.push("Invalid sign in message");
                                logs.push(siweData.error);
                                return [2 /*return*/, reply.code(400).send({
                                        success: true,
                                        logs: logs
                                    })];
                            }
                            nonce = Math.random().toString(36).substring(2, 15);
                            return [4 /*yield*/, db_1.prisma.siweSession.create({
                                    data: {
                                        address: siweData.address,
                                        nonce: siweData.nonce,
                                        issuedAt: new Date(),
                                        // expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiry
                                        expirationTime: siweData.expirationTime
                                    },
                                })];
                        case 3:
                            session = _b.sent();
                            return [4 /*yield*/, db_1.prisma.user.upsert({
                                    where: {
                                        user: siweData.address,
                                    },
                                    update: {}, // Optional: what to update if the user exists
                                    create: {
                                        user: siweData.address // What to create if the user doesn't exist
                                    }
                                })];
                        case 4:
                            user = _b.sent();
                            return [4 /*yield*/, db_1.prisma.settings.findFirst({
                                    where: {
                                        user_pub_key: siweData.address
                                    }
                                })];
                        case 5:
                            settingsData = _b.sent();
                            if (!(settingsData == null)) return [3 /*break*/, 7];
                            defaultData = {
                                user_pub_key: siweData.address,
                                cli_pub_key: "",
                                cli_priv_key: "",
                                Witness_network: "sepolia",
                                theme: "light",
                                Witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                            };
                            return [4 /*yield*/, db_1.prisma.settings.create({
                                    data: defaultData
                                })];
                        case 6:
                            _b.sent();
                            _b.label = 7;
                        case 7: return [2 /*return*/, reply.code(201).send({
                                success: true,
                                logs: logs,
                                session: session,
                            })];
                        case 8:
                            error_3 = _b.sent();
                            logs.push("SIWE sign-in failed: ".concat(error_3));
                            fastify.log.error(error_3);
                            return [2 /*return*/, reply.code(400).send({
                                    success: false,
                                    logs: logs,
                                    session: null,
                                })];
                        case 9: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
