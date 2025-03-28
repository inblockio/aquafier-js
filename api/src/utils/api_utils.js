"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPort = exports.getHost = void 0;
var getHost = function () {
    return process.env.HOST || '127.0.0.1';
};
exports.getHost = getHost;
var getPort = function () {
    return Number(process.env.PORT) || 3000;
};
exports.getPort = getPort;
