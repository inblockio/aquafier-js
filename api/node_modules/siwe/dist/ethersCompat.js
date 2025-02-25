"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAddress = exports.hashMessage = exports.verifyMessage = void 0;
const ethers_1 = require("ethers");
let ethersVerifyMessage = null;
let ethersHashMessage = null;
let ethersGetAddress = null;
try {
    // @ts-expect-error -- v6 compatibility hack
    ethersVerifyMessage = ethers_1.ethers.utils.verifyMessage;
    // @ts-expect-error -- v6 compatibility hack
    ethersHashMessage = ethers_1.ethers.utils.hashMessage;
    // @ts-expect-error -- v6 compatibility hack
    ethersGetAddress = ethers_1.ethers.utils.getAddress;
}
catch (_a) {
    ethersVerifyMessage = ethers_1.ethers.verifyMessage;
    ethersHashMessage = ethers_1.ethers.hashMessage;
    ethersGetAddress = ethers_1.ethers.getAddress;
}
exports.verifyMessage = ethersVerifyMessage;
exports.hashMessage = ethersHashMessage;
exports.getAddress = ethersGetAddress;
