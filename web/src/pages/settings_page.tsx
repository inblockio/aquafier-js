import { useState } from 'react';
import { LuSettings, LuSun, LuUser, LuWallet, LuKey, LuNetwork, LuSave } from 'react-icons/lu';
import { FaEthereum, FaFileContract } from 'react-icons/fa6';
import appStore from '@/store';
import { useStore } from 'zustand';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { Button } from '@/components/ui/button';

const DeleteUserData = () => {
    const [_deleting, setDeleting] = useState(false)

    let navigate = useNavigate()

    const { setUserProfile, setFiles, setSession, setMetamaskAddress, setAvatar, backend_url, session } = useStore(appStore)


    const deleteUserData = async () => {
        try {
            if (!session?.nonce) {
                toast("You must be logged in to clear user data")
                return
            }

            setDeleting(true)
            const url = `${backend_url}/user_data`;
            const response = await axios.delete(url, {
                headers: {
                    'nonce': session.nonce
                }
            });

            if (response.status === 200) {
                // Clear local state
                setUserProfile({
                    user_pub_key: "",
                    cli_pub_key: "",
                    cli_priv_key: "",
                    witness_network: "",
                    alchemy_key: "",
                    theme: "light",
                    ens_name: "",
                    witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                })
                setFiles([])
                setSession(null)
                setMetamaskAddress(null)
                setAvatar(undefined)

                // Remove cookie
                document.cookie = "pkc_nonce=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

                toast("User data cleared successfully. You have been logged out.")

                if (window.location.pathname == "/") {
                    window.location.reload();
                } else {
                    navigate("/app")
                }
            }

            setDeleting(false)
        }
        catch (e: any) {
            toast(`Failed to clear user data: ${e instanceof Error ? e.message : String(e)}`)
            setDeleting(false)
        }
    }

    return (
        <Button data-testid="delete-user-data-button" 
        // className='bg-red-500 hover:bg-red-600 color-white rounded-md' 
        className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors rounded-lg"

        variant={'outline'} onClick={deleteUserData}>Clear Account Data</Button>
    )
}

export default function SettingsPage() {

    const { setUserProfile, user_profile, backend_url, metamaskAddress, session } = useStore(appStore)
    
        const [activeNetwork, setActiveNetwork] = useState<string>(user_profile.witness_network)
        const [cliPubKey, _setCliPubKey] = useState<string>(user_profile.cli_pub_key)
        const [cliPrivKey, _setCliPrivKey] = useState<string>(user_profile.cli_priv_key)
        const [ensName, setEnsName] = useState<string>(user_profile.ens_name)
        const [contract, _setContract] = useState<string>(user_profile.witness_contract_address ?? "0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611")
        const [alchemyKey, setAlchemyKey] = useState<string>(user_profile.alchemy_key ?? "ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ")
    

    const networks = ['Mainnet', 'Sepolia', 'Holesky'];

    const updateUserProfile = async () => {
        // const formData = new URLSearchParams();
        // formData.append('cli_priv_key', cliPrivKey);
        // formData.append('cli_pub_key', cliPubKey);
        // formData.append('witness_contract_address', contract);
        // formData.append('witness_network', activeNetwork);
        // formData.append("user_pub_key", metamaskAddress ?? user_profile.user_pub_key)
        // formData.append('theme', colorMode ?? "light");


        const url = `${backend_url}/explorer_update_user_settings`;

        const response = await axios.post(url, {
            'ens_name': ensName,
            'cli_priv_key': cliPrivKey,
            'cli_pub_key': cliPubKey,
            'witness_contract_address': contract,
            'alchemy_key': alchemyKey,
            'witness_network': activeNetwork,
            'user_pub_key': metamaskAddress ?? user_profile.user_pub_key,
            'theme': "light",
        }, {
            headers: {
                'metamask_address': metamaskAddress ?? user_profile.user_pub_key,
                'nonce': session?.nonce
                // 'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.status === 200) {
            setUserProfile({
                user_pub_key: user_profile.user_pub_key,
                cli_pub_key: cliPubKey,
                ens_name: ensName,
                cli_priv_key: cliPrivKey,
                witness_network: activeNetwork,
                alchemy_key: alchemyKey,
                theme: "light",
                witness_contract_address: contract ?? '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',

            })

            toast("Settings saved successfully")

        }
    }

    return (
        <div className="container mx-auto py-3 xs:px-6">
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <LuSettings className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Themes Section */}
                    <div className="col-span-1 md:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <LuSun className="h-5 w-5 text-amber-500" />
                                Appearance
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <span className="font-medium">Theme</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">Light</span>
                                    <LuSun className="h-5 w-5 text-amber-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* User Profile Card */}
                    <div className="col-span-1 md:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <LuUser className="h-5 w-5 text-primary" />
                                User Profile
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <span>Alias Name</span>
                                    </label>
                                    <input
                                    data-testid="alias-name-input"
                                        type="text"
                                        value={ensName}
                                        onChange={(e) => setEnsName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800/80"
                                        placeholder="Enter your alias name"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ethereum Settings Card */}
                    <div className="col-span-1 md:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <FaEthereum className="h-5 w-5 text-primary" />
                                Ethereum Settings
                            </h2>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Public Address */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <LuWallet className="h-4 w-4 text-gray-500" />
                                    <span>Public Address</span>
                                </label>
                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono break-all">
                                    {metamaskAddress}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                                    Self-issued identity claim used for generating/verifying aqua chain
                                </p>
                            </div>

                            {/* Alchemy Key */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <LuKey className="h-4 w-4 text-gray-500" />
                                    <span>Alchemy Key</span>
                                </label>
                                <input
                                    type="text"
                                    value={alchemyKey}
                                    onChange={(e) => setAlchemyKey(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm dark:bg-gray-800/80"
                                    placeholder="Enter your Alchemy API key"
                                />
                            </div>

                            {/* Contract Address */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <FaFileContract className="h-4 w-4 text-gray-500" />
                                    <span>Contract Address</span>
                                </label>
                                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono break-all">
                                    {contract}
                                </div>
                            </div>

                            {/* Network Selection */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <LuNetwork className="h-4 w-4 text-gray-500" />
                                    <span>Network</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {networks.map((network) => (
                                        <button
                                            key={network}
                                            onClick={() => setActiveNetwork(network)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeNetwork === network
                                                ? 'bg-primary text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            {network}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="col-span-1 md:col-span-3 flex flex-wrap justify-end gap-3 mt-4">
                        <DeleteUserData />
                        <button 
                         data-testid="save-changes-settings"
                            className="inline-flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors"
                            onClick={updateUserProfile}
                        >
                            <LuSave className="h-4 w-4" />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}