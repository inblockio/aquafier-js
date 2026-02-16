import Dexie, { Table } from 'dexie';
import { IDENTITY_CLAIMS } from './constants';

// Import queryClient for React Query integration
let queryClient: any = null;

export const setQueryClient = (client: any) => {
  queryClient = client;
};

export interface ReloadConfig {
    id?: number;
    key: string;
    value: boolean;
    timestamp: number;
}

export class ReloadDatabase extends Dexie {
    reloadConfigs!: Table<ReloadConfig>;

    constructor() {
        super('AquafierReloadDB');
        this.version(1).stores({
            reloadConfigs: '++id, key, value, timestamp'
        });
    }
}

export const reloadDB = new ReloadDatabase();

// Helper functions
export const triggerReload = async (key: string) => {
    try {
        const existing = await reloadDB.reloadConfigs.where('key').equals(key).first();

        if (existing) {
            await reloadDB.reloadConfigs.update(existing.id!, {
                value: true,
                timestamp: Date.now()
            });
        } else {
            await reloadDB.reloadConfigs.add({
                key,
                value: true,
                timestamp: Date.now()
            });
        }
    } catch (error) {
        console.error('Error triggering reload:', error);
    }
};

export const clearReload = async (key: string) => {
    try {
        const existing = await reloadDB.reloadConfigs.where('key').equals(key).first();

        if (existing) {
            await reloadDB.reloadConfigs.update(existing.id!, {
                value: false,
                timestamp: Date.now()
            });
        }
    } catch (error) {
        console.error('Error clearing reload:', error);
    }
};

export const getReloadStatus = async (key: string): Promise<boolean> => {
    try {
        const config = await reloadDB.reloadConfigs.where('key').equals(key).first();
        return config?.value || false;
    } catch (error) {
        console.error('Error getting reload status:', error);
        return false;
    }
};


export const RELOAD_KEYS = {
    access_agreement: "access_agreement",
    aqua_sign: "aqua_sign",
    cheque: "cheque",
    dba_claim: "dba_claim",
    identity_attestation: "identity_attestation",
    identity_claim: "identity_claim",
    user_signature: "user_signature",
    domain_claim: "domain_claim",
    email_claim: "email_claim",
    phone_number_claim: "phone_number_claim",
    user_profile: "user_profile",
    user_files: "user_files",
    all_files: "all_files",
    notifications: "notifications",
    claims_and_attestations: "claims_and_attestations",
    user_stats: "user_stats",
    contacts: "contacts",
    identity_card: "identity_card",
    ens_claim: "ens_claim",
    aqua_certificate: "aqua_certificate",
    aquafier_licence: "aquafier_licence",
    reload_aqua_sign: "reload_aqua_sign"
};

// Map reload keys to React Query query keys
export const QUERY_KEY_MAPPING: Record<string, string[]> = {
    [RELOAD_KEYS.user_stats]: ['userStats'],
    [RELOAD_KEYS.user_files]: ['files'],
    [RELOAD_KEYS.all_files]: ['files'],
    [RELOAD_KEYS.notifications]: ['notifications'],
    [RELOAD_KEYS.contacts]: ['contacts'],
};

/**
 * Trigger reload for a specific workflow type
 * Handles special cases for custom file views and identity claims
 */
export const triggerWorkflowReload = async (workflowType: string, watchAll?: boolean) => {
    try {
        // console.log("Workflow type: ", workflowType)
        if (workflowType === 'all') {
            await triggerReload(RELOAD_KEYS.all_files);
            await triggerReload(RELOAD_KEYS.contacts);
            // Invalidate and refetch React Query cache
            if (queryClient) {
                await queryClient.invalidateQueries({
                    queryKey: ['files'],
                    refetchType: 'active'
                });
                await queryClient.invalidateQueries({
                    queryKey: ['contacts'],
                    refetchType: 'active'
                });
            }
            if (watchAll) {
                await triggerReload(RELOAD_KEYS.user_stats);
                if (queryClient) {
                    await queryClient.invalidateQueries({
                        queryKey: ['userStats'],
                        refetchType: 'active'
                    });
                }
            }
            return;
        }

        if (workflowType === 'user_files') {
            await triggerReload(RELOAD_KEYS.user_files);
            // Invalidate and refetch React Query cache
            if (queryClient) {
                await queryClient.invalidateQueries({
                    queryKey: ['files'],
                    refetchType: 'active'
                });
            }
            if (watchAll) {
                await triggerReload(RELOAD_KEYS.user_stats);
                if (queryClient) {
                    await queryClient.invalidateQueries({
                        queryKey: ['userStats'],
                        refetchType: 'active'
                    });
                }
            }
            return;
        }

        if (workflowType === 'contacts') {
            await triggerReload(RELOAD_KEYS.contacts);
            // Invalidate and refetch React Query cache
            if (queryClient) {
                await queryClient.invalidateQueries({
                    queryKey: ['contacts'],
                    refetchType: 'active'
                });
            }
            return;
        }

        if (IDENTITY_CLAIMS.includes(workflowType)) {
            await triggerReload(RELOAD_KEYS.claims_and_attestations);
            await triggerReload(workflowType);
            await triggerReload(RELOAD_KEYS.contacts);
            // Invalidate and refetch React Query cache
            if (queryClient) {
                await queryClient.invalidateQueries({
                    queryKey: ['contacts'],
                    refetchType: 'active'
                });
            }
            return;
        }

        // Check if it's a specific workflow type in RELOAD_KEYS
        const reloadKey = (RELOAD_KEYS as any)[workflowType];
        if (reloadKey) {
            await triggerReload(reloadKey);

            // Also trigger claims_and_attestations if it's an identity claim
            const identityClaims = ['identity_claim', 'user_signature', 'email_claim', 'phone_number_claim', 'domain_claim', 'identity_attestation'];
            if (identityClaims.includes(workflowType)) {
                await triggerReload(RELOAD_KEYS.claims_and_attestations);
            }
        } else {
            // Fallback: use the workflow type as the key
            await triggerReload(workflowType);
        }

        // If watchAll is true, always trigger stats reload since any workflow change affects stats
        if (watchAll) {
            await triggerReload(RELOAD_KEYS.user_stats);
        }

        // Invalidate and refetch React Query cache if queryClient is available
        if (queryClient) {
            const queryKeys = QUERY_KEY_MAPPING[workflowType];
            if (queryKeys) {
                for (const queryKey of queryKeys) {
                    await queryClient.invalidateQueries({
                        queryKey: [queryKey],
                        refetchType: 'active'
                    });
                }
            }

            // Also invalidate for specific reload keys
            if (watchAll) {
                await queryClient.invalidateQueries({
                    queryKey: ['userStats'],
                    refetchType: 'active'
                });
            }
        }
    } catch (error) {
        console.error(`Error triggering reload for ${workflowType}:`, error);
    }
};
