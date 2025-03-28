"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.default = userController;
var db_1 = require("../database/db");
function userController(fastify) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            // get current session
            fastify.get('/explorer_fetch_user_settings', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var nonce, session, settingsData, defaultData, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            nonce = request.headers['nonce'];
                            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                                return [2 /*return*/, reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' })];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 7, , 8]);
                            return [4 /*yield*/, db_1.prisma.siweSession.findUnique({
                                    where: { nonce: nonce }
                                })];
                        case 2:
                            session = _a.sent();
                            if (!session) {
                                return [2 /*return*/, reply.code(404).send({ success: false, message: "Session not found" })];
                            }
                            // Check if session is expired
                            if (new Date(session.expirationTime) < new Date()) {
                                return [2 /*return*/, reply.code(401).send({ success: false, message: "Session expired" })];
                            }
                            return [4 /*yield*/, db_1.prisma.settings.findFirst({
                                    where: {
                                        user_pub_key: session.address
                                    }
                                })];
                        case 3:
                            settingsData = _a.sent();
                            if (!(settingsData == null)) return [3 /*break*/, 5];
                            defaultData = {
                                user_pub_key: session.address,
                                cli_pub_key: "",
                                cli_priv_key: "",
                                Witness_network: "sepolia",
                                theme: "light",
                                Witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                            };
                            return [4 /*yield*/, db_1.prisma.settings.create({
                                    data: defaultData
                                })];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, {
                                    success: true,
                                    data: defaultData
                                }];
                        case 5: return [2 /*return*/, {
                                success: true,
                                data: settingsData
                            }];
                        case 6: return [3 /*break*/, 8];
                        case 7:
                            error_1 = _a.sent();
                            console.error("Error fetching session:", error_1);
                            return [2 /*return*/, reply.code(500).send({ success: false, message: "Internal server error" })];
                        case 8: return [2 /*return*/];
                    }
                });
            }); });
            fastify.post('/explorer_update_user_settings', function (request, reply) { return __awaiter(_this, void 0, void 0, function () {
                var nonce, settings, session, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            nonce = request.headers['nonce'];
                            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                                return [2 /*return*/, reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' })];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            settings = request.body;
                            return [4 /*yield*/, db_1.prisma.siweSession.findUnique({
                                    where: { nonce: nonce }
                                })];
                        case 2:
                            session = _a.sent();
                            if (!session) {
                                return [2 /*return*/, reply.code(404).send({ success: false, message: "Session not found" })];
                            }
                            // Check if session is expired
                            if (new Date(session.expirationTime) < new Date()) {
                                return [2 /*return*/, reply.code(401).send({ success: false, message: "Session expired" })];
                            }
                            return [4 /*yield*/, db_1.prisma.settings.update({
                                    where: {
                                        user_pub_key: session.address
                                    },
                                    data: __assign(__assign({}, settings), { user_pub_key: session.address })
                                })];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            error_2 = _a.sent();
                            console.error("Error fetching session:", error_2);
                            return [2 /*return*/, reply.code(500).send({ success: false, message: "Internal server error" })];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
