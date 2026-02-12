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
