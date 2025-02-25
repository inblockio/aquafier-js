import { ethers } from 'ethers';
type ProviderV5 = ethers.providers.Provider;
type ProviderV6 = ethers.Provider;
export type Provider = ProviderV6 extends undefined ? ProviderV5 : ProviderV6;
export declare const verifyMessage: any;
export declare const hashMessage: any;
export declare const getAddress: any;
export {};
