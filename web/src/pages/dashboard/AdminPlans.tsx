import { useEffect, useState } from 'react';
import {
    RefreshCw,
    Shield,
    Plus,
    Pencil,
    Trash2,
    X,
    Save,
    HardDrive,
    FileText,
    File,
    Layout,
    Eye,
    EyeOff,
    Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    AdminPlan,
    AdminPlanInput,
    fetchAdminPlans,
    createAdminPlan,
    updateAdminPlan,
    deleteAdminPlan,
} from '@/api/adminApi';

interface PlanFormData {
    id: string;
    name: string;
    display_name: string;
    description: string;
    price_monthly_usd: string;
    price_yearly_usd: string;
    stripe_monthly_price_id: string;
    stripe_yearly_price_id: string;
    crypto_monthly_price_usd: string;
    crypto_yearly_price_usd: string;
    max_storage_gb: number;
    max_files: number;
    max_contracts: number;
    max_templates: number;
    sort_order: number;
    is_active: boolean;
    is_public: boolean;
}

const emptyForm: PlanFormData = {
    id: '',
    name: '',
    display_name: '',
    description: '',
    price_monthly_usd: '0',
    price_yearly_usd: '0',
    stripe_monthly_price_id: '',
    stripe_yearly_price_id: '',
    crypto_monthly_price_usd: '',
    crypto_yearly_price_usd: '',
    max_storage_gb: 1,
    max_files: 100,
    max_contracts: 10,
    max_templates: 5,
    sort_order: 0,
    is_active: true,
    is_public: true,
};

function planToForm(plan: AdminPlan): PlanFormData {
    return {
        id: plan.id,
        name: plan.name,
        display_name: plan.display_name,
        description: plan.description || '',
        price_monthly_usd: plan.price_monthly_usd?.toString() || '0',
        price_yearly_usd: plan.price_yearly_usd?.toString() || '0',
        stripe_monthly_price_id: plan.stripe_monthly_price_id || '',
        stripe_yearly_price_id: plan.stripe_yearly_price_id || '',
        crypto_monthly_price_usd: plan.crypto_monthly_price_usd?.toString() || '',
        crypto_yearly_price_usd: plan.crypto_yearly_price_usd?.toString() || '',
        max_storage_gb: plan.max_storage_gb,
        max_files: plan.max_files,
        max_contracts: plan.max_contracts,
        max_templates: plan.max_templates,
        sort_order: plan.sort_order,
        is_active: plan.is_active,
        is_public: plan.is_public,
    };
}

const AdminPlans = () => {
    const [plans, setPlans] = useState<AdminPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<PlanFormData | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadPlans = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAdminPlans();
            setPlans(data);
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 403) {
                setError('You are not authorized to manage plans.');
            } else {
                setError('Failed to load plans.');
            }
            toast.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlans();
    }, []);

    const handleEdit = (plan: AdminPlan) => {
        setIsCreating(false);
        setEditingPlan(planToForm(plan));
    };

    const handleCreate = () => {
        setIsCreating(true);
        setEditingPlan({ ...emptyForm });
    };

    const handleCancel = () => {
        setEditingPlan(null);
        setIsCreating(false);
    };

    const handleSave = async () => {
        if (!editingPlan) return;

        setSaving(true);
        try {
            const payload: AdminPlanInput = {
                id: editingPlan.id,
                name: editingPlan.name,
                display_name: editingPlan.display_name,
                description: editingPlan.description || null,
                price_monthly_usd: parseFloat(editingPlan.price_monthly_usd) || 0,
                price_yearly_usd: parseFloat(editingPlan.price_yearly_usd) || 0,
                crypto_monthly_price_usd: editingPlan.crypto_monthly_price_usd ? parseFloat(editingPlan.crypto_monthly_price_usd) : null,
                crypto_yearly_price_usd: editingPlan.crypto_yearly_price_usd ? parseFloat(editingPlan.crypto_yearly_price_usd) : null,
                stripe_monthly_price_id: editingPlan.stripe_monthly_price_id || null,
                stripe_yearly_price_id: editingPlan.stripe_yearly_price_id || null,
                max_storage_gb: editingPlan.max_storage_gb,
                max_files: editingPlan.max_files,
                max_contracts: editingPlan.max_contracts,
                max_templates: editingPlan.max_templates,
                sort_order: editingPlan.sort_order,
                is_active: editingPlan.is_active,
                is_public: editingPlan.is_public,
            };

            if (isCreating) {
                await createAdminPlan(payload);
                toast.success('Plan created');
            } else {
                await updateAdminPlan(editingPlan.id, payload);
                toast.success('Plan updated');
            }

            setEditingPlan(null);
            setIsCreating(false);
            await loadPlans();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save plan');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (plan: AdminPlan) => {
        if (!confirm(`Delete plan "${plan.display_name}"? This cannot be undone.`)) return;

        try {
            await deleteAdminPlan(plan.id);
            toast.success('Plan deleted');
            await loadPlans();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete plan');
        }
    };

    const handleToggleActive = async (plan: AdminPlan) => {
        try {
            await updateAdminPlan(plan.id, { is_active: !plan.is_active });
            toast.success(`Plan ${plan.is_active ? 'deactivated' : 'activated'}`);
            await loadPlans();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update plan');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-slate-500">Loading plans...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-md">
                    <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-700 mb-2">Access Denied</h2>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Subscription Plans</h1>
                    <p className="text-slate-500 mt-1">Manage pricing plans and their limits</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadPlans}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 font-medium"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        New Plan
                    </button>
                </div>
            </div>

            {/* Plans Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-600">Plan</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Monthly Price</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Limits</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Order</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Subscribers</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {plans.map((plan) => (
                                <tr key={plan.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-slate-800">{plan.display_name}</p>
                                            <p className="text-xs text-slate-400">{plan.name} ({plan.id})</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-slate-800">${plan.price_monthly_usd}</span>
                                        <span className="text-xs text-slate-400 ml-1">/mo</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                <HardDrive className="w-3 h-3" />{plan.max_storage_gb}GB
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                <FileText className="w-3 h-3" />{plan.max_files} files
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                <File className="w-3 h-3" />{plan.max_contracts} contracts
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                <Layout className="w-3 h-3" />{plan.max_templates} templates
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{plan.sort_order}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => handleToggleActive(plan)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer ${plan.is_active
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-red-50 text-red-700 border-red-200'
                                                    }`}
                                            >
                                                {plan.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                {plan.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                            <span className={`inline-flex items-center gap-1 text-xs ${plan.is_public ? 'text-blue-600' : 'text-slate-400'}`}>
                                                {plan.is_public ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                {plan.is_public ? 'Public' : 'Hidden'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-slate-800">{plan._count?.subscriptions || 0}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(plan)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit plan"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(plan)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete plan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {plans.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        No plans found. Click "New Plan" to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit/Create Modal */}
            {editingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                            <h2 className="text-lg font-bold text-slate-800">
                                {isCreating ? 'Create New Plan' : `Edit: ${editingPlan.display_name}`}
                            </h2>
                            <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">ID</label>
                                        <input
                                            type="text"
                                            value={editingPlan.id}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, id: e.target.value })}
                                            disabled={!isCreating}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Name (unique)</label>
                                        <input
                                            type="text"
                                            value={editingPlan.name}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                                        <input
                                            type="text"
                                            value={editingPlan.display_name}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, display_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea
                                            value={editingPlan.description}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Pricing (USD)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingPlan.price_monthly_usd}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly_usd: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Yearly Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingPlan.price_yearly_usd}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, price_yearly_usd: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Crypto Monthly Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingPlan.crypto_monthly_price_usd}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, crypto_monthly_price_usd: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Crypto Yearly Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingPlan.crypto_yearly_price_usd}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, crypto_yearly_price_usd: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Stripe IDs */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Stripe Price IDs</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Price ID</label>
                                        <input
                                            type="text"
                                            value={editingPlan.stripe_monthly_price_id}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, stripe_monthly_price_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="price_..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Yearly Price ID</label>
                                        <input
                                            type="text"
                                            value={editingPlan.stripe_yearly_price_id}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, stripe_yearly_price_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="price_..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Limits */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Plan Limits</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Storage (GB)</label>
                                        <input
                                            type="number"
                                            value={editingPlan.max_storage_gb}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, max_storage_gb: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Files</label>
                                        <input
                                            type="number"
                                            value={editingPlan.max_files}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, max_files: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Contracts</label>
                                        <input
                                            type="number"
                                            value={editingPlan.max_contracts}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, max_contracts: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Templates</label>
                                        <input
                                            type="number"
                                            value={editingPlan.max_templates}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, max_templates: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Visibility & Order */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Visibility & Ordering</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                                        <input
                                            type="number"
                                            value={editingPlan.sort_order}
                                            onChange={(e) => setEditingPlan({ ...editingPlan, sort_order: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editingPlan.is_active}
                                                onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 rounded border-slate-300"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Active</span>
                                        </label>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editingPlan.is_public}
                                                onChange={(e) => setEditingPlan({ ...editingPlan, is_public: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 rounded border-slate-300"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Public (show on pricing page)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : (isCreating ? 'Create Plan' : 'Save Changes')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPlans;
