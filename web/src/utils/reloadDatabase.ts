import Dexie, { Table } from 'dexie';

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
    aqua_files: "aqua_files",
    all_files: "all_files",
    notifications: "notifications",
    claims_and_attestations: "claims_and_attestations",
    user_stats: "user_stats",
    contacts: "contacts",
};

/**
 * Trigger reload for a specific workflow type
 * Handles special cases for custom file views and identity claims
 */
export const triggerWorkflowReload = async (workflowType: string, watchAll?: boolean) => {
    try {
        // Handle special cases
        if (workflowType === 'all') {
            await triggerReload(RELOAD_KEYS.all_files);
            return;
        }
        
        if (workflowType === 'aqua_files') {
            await triggerReload(RELOAD_KEYS.aqua_files);
            return;
        }

        if (workflowType === 'contacts') {
            await triggerReload(RELOAD_KEYS.contacts);
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
            await triggerReload(RELOAD_KEYS.contacts);
        }
    } catch (error) {
        console.error(`Error triggering reload for ${workflowType}:`, error);
    }
};
