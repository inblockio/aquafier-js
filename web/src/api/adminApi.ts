import apiClient from './axiosInstance';
import appStore from '../store';
import { ensureDomainUrlHasSSL } from '@/utils/functions';
import { RELOAD_KEYS } from '@/utils/reloadDatabase';

const getBackendUrl = () => {
    const { backend_url } = appStore.getState();
    return backend_url || 'http://localhost:3000';
};

const getHeaders = () => {
    const { session } = appStore.getState();
    if (session?.nonce) {
        return { nonce: session.nonce };
    }
    return {};
};

export interface AdminPlan {
    id: string;
    name: string;
    display_name: string;
    description: string | null;
    price_monthly_usd: string;
    price_yearly_usd: string;
    stripe_monthly_price_id: string | null;
    stripe_yearly_price_id: string | null;
    crypto_monthly_price_usd: string | null;
    crypto_yearly_price_usd: string | null;
    max_storage_gb: number;
    max_files: number;
    max_contracts: number;
    max_templates: number;
    features: Record<string, any>;
    sort_order: number;
    is_active: boolean;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    _count: {
        subscriptions: number;
    };
}

export async function fetchAdminPlans(): Promise<AdminPlan[]> {
    const backendUrl = getBackendUrl();
    const headers = getHeaders();
    const url = ensureDomainUrlHasSSL(`${backendUrl}/admin/plans`);

    const response = await apiClient.get(url, { headers });

    if (response.data.success) {
        return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to fetch plans');
}

export async function fetchAdminPlan(planId: string): Promise<AdminPlan> {
    const backendUrl = getBackendUrl();
    const headers = getHeaders();
    const url = ensureDomainUrlHasSSL(`${backendUrl}/admin/plans/${planId}`);

    const response = await apiClient.get(url, { headers });

    if (response.data.success) {
        return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to fetch plan');
}

export interface AdminPlanInput {
    id?: string;
    name?: string;
    display_name?: string;
    description?: string | null;
    price_monthly_usd?: number;
    price_yearly_usd?: number;
    stripe_monthly_price_id?: string | null;
    stripe_yearly_price_id?: string | null;
    crypto_monthly_price_usd?: number | null;
    crypto_yearly_price_usd?: number | null;
    max_storage_gb?: number;
    max_files?: number;
    max_contracts?: number;
    max_templates?: number;
    features?: Record<string, any>;
    sort_order?: number;
    is_active?: boolean;
    is_public?: boolean;
}

export async function createAdminPlan(data: AdminPlanInput): Promise<AdminPlan> {
    const backendUrl = getBackendUrl();
    const headers = getHeaders();
    const url = ensureDomainUrlHasSSL(`${backendUrl}/admin/plans`);

    const response = await apiClient.post(url, data, { headers, reloadKeys: [RELOAD_KEYS.user_stats] });

    if (response.data.success) {
        return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to create plan');
}

export async function updateAdminPlan(planId: string, data: AdminPlanInput): Promise<AdminPlan> {
    const backendUrl = getBackendUrl();
    const headers = getHeaders();
    const url = ensureDomainUrlHasSSL(`${backendUrl}/admin/plans/${planId}`);

    const response = await apiClient.put(url, data, { headers, reloadKeys: [RELOAD_KEYS.user_stats] });

    if (response.data.success) {
        return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to update plan');
}

export async function deleteAdminPlan(planId: string): Promise<void> {
    const backendUrl = getBackendUrl();
    const headers = getHeaders();
    const url = ensureDomainUrlHasSSL(`${backendUrl}/admin/plans/${planId}`);

    const response = await apiClient.delete(url, { headers, reloadKeys: [RELOAD_KEYS.user_stats] });

    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete plan');
    }
}

export interface BackupUser {
    address: string;
    treeCount: number;
    estimatedBytes: number;
}

export async function fetchBackupUsers(): Promise<BackupUser[]> {
    const url = ensureDomainUrlHasSSL(`${getBackendUrl()}/admin/backup/users`);
    const response = await apiClient.get(url, { headers: getHeaders() });
    return response.data.users ?? [];
}

/**
 * Pull one user's workspace zip and hand it to the browser as a download.
 *
 * The server streams the archive, so this holds one user's backup in memory at a
 * time — which is why the caller must not run these concurrently.
 */
export async function downloadUserBackup(address: string): Promise<void> {
    const url = ensureDomainUrlHasSSL(`${getBackendUrl()}/admin/backup/${address}`);

    const response = await apiClient.get(url, {
        headers: getHeaders(),
        responseType: 'blob',
    });

    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', `workspace_${address}.zip`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
}

export interface DeletionSummary {
    [table: string]: number;
}

export async function deleteUserDataAsAdmin(address: string): Promise<DeletionSummary> {
    const url = ensureDomainUrlHasSSL(`${getBackendUrl()}/admin/user_data/${address}`);

    const response = await apiClient.delete(url, {
        headers: getHeaders(),
        reloadKeys: [RELOAD_KEYS.user_stats],
    });

    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete user data');
    }

    return response.data.deleted ?? {};
}
