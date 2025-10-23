import { useEffect, useState } from "react";
import appStore from "@/store";
import { useStore } from "zustand";
import { ContactProfile } from "@/types/types";
import { fetchFiles, fetchWalletAddressesAndNamesForInputRecommendation, getAquaTreeFileName, getGenesisHash, isWorkFlowData } from "@/utils/functions";
import { OrderRevisionInAquaTree, Revision } from "aqua-js-sdk";
import { ApiFileInfo } from "@/models/FileInfo";
import WalletAdrressClaim from "../v2_claims_workflow/WalletAdrressClaim";
import { JSX } from "react";
import { LuGlobe, LuMail, LuPhone, LuSignature } from "react-icons/lu";
import { LucideUserCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom'
import { WalletAutosuggest } from "@/components/wallet_auto_suggest";

const CLAIMS = new Set([
    "user_profile",
    "identity_claim",
    "identity_attestation",
    "domain_claim",
    "email_claim",
    "phone_number_claim",
    "user_signature",
]);

const ContactsPage = () => {
    const { systemFileInfo, session, setWorkflows, workflows, backend_url } = useStore(appStore);
    const [contactProfiles, setContactProfiles] = useState<ContactProfile[]>([]);
    const [filterMultipleAddresses, setFilterMultipleAddresses] = useState<string[]>([''])

    const [isLoading, setIsLoading] = useState<boolean>(false)


    const navigate = useNavigate()
    const systemTreeNames = systemFileInfo.map((info) => {
        try {
            return getAquaTreeFileName(info.aquaTree!);
        } catch {
            return "";
        }
    });

    useEffect(() => {
      

        const loadWorkflows = async () => {
            setIsLoading(true);
            try {
                const filesApi = await fetchFiles(session!.address, `${backend_url}/workflows`, session!.nonce);
                setWorkflows({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' });
                processFilesToGetWorkflows(filesApi.files);
            } catch (error) {
                console.error('Failed to load workflows:', error);
                // Consider setting an error state here
            } finally {
                setIsLoading(false);
            }
        };
        loadWorkflows();
    }, [])

    const processFilesToGetWorkflows = (files: ApiFileInfo[]) => {


        if (!files?.length || !systemFileInfo?.length) return;

        const contactProfileMap = new Map<string, ContactProfile>();

        for (const element of files) {
            const workFlow = isWorkFlowData(element.aquaTree!, systemTreeNames);
            if (!workFlow.isWorkFlow || !workFlow.workFlow) continue;

            const claimType = workFlow.workFlow;
            if (!CLAIMS.has(claimType)) continue;

            const orderedAquaTree = OrderRevisionInAquaTree(element.aquaTree!);
            const allRevisions = Object.values(orderedAquaTree.revisions);
            let walletAddress = ""
            if (workFlow.workFlow == "identity_attestation") {

                let genHash = getGenesisHash(element.aquaTree!)
                if (genHash) {

                    let genRevision = element.aquaTree!.revisions[genHash]
                    let walletClaimOwner = genRevision["forms_claim_wallet_address"]

                    if (walletClaimOwner) {
                        walletAddress = walletClaimOwner
                    }
                }
            } else {
                const signatureRevision = allRevisions.find(
                    (r) => r.revision_type === "signature"
                ) as Revision | undefined;

                if (!signatureRevision?.signature_wallet_address) continue;

                walletAddress = signatureRevision.signature_wallet_address;
            }

            const existingProfile = contactProfileMap.get(walletAddress);

            if (existingProfile) {
                existingProfile.file.push(element);
            } else {
                contactProfileMap.set(walletAddress, {
                    walletAddress,
                    file: [element],
                });
            }
        }

        setContactProfiles(Array.from(contactProfileMap.values()));
    };

    let profileBadges = (contactProfileFiles: ApiFileInfo[]) => {
        const badgeCounts: Record<string, number> = {};

        for (const element of contactProfileFiles) {
            const workFlow = isWorkFlowData(element.aquaTree!, systemTreeNames);
            if (!workFlow.workFlow) continue;

            const claimType = workFlow.workFlow;
            badgeCounts[claimType] = (badgeCounts[claimType] || 0) + 1;
        }

        const badgeConfig: Record<string, { icon: JSX.Element; label: string; bgColor: string; textColor: string }> = {
            user_profile: {
                icon: <LucideUserCircle size={22} />,
                label: "User Profile",
                bgColor: "bg-purple-100",
                textColor: "text-purple-700"
            },
            identity_claim: {
                icon: <LucideUserCircle size={22} />,
                label: "Name Claim",
                bgColor: "bg-yellow-100",
                textColor: "text-yellow-700"
            },
            identity_attestation: {
                icon: <LucideUserCircle size={22} />,
                label: "Name Attestation",
                bgColor: "bg-blue-100",
                textColor: "text-blue-700"
            },
            domain_claim: {
                icon: <LuGlobe size={22} />,
                label: "Domain Claim",
                bgColor: "bg-indigo-100",
                textColor: "text-indigo-700"
            },
            email_claim: {
                icon: <LuMail size={22} />,
                label: "Email Claim",
                bgColor: "bg-green-100",
                textColor: "text-green-700"
            },
            phone_number_claim: {
                icon: <LuPhone size={22} />,
                label: "Phone Number Claim",
                bgColor: "bg-pink-100",
                textColor: "text-pink-700"
            },
            user_signature: {
                icon: <LuSignature size={22} />,
                label: "User Signature",
                bgColor: "bg-gray-100",
                textColor: "text-gray-700"
            },
        };

        const allBadges = Object.entries(badgeCounts).map(([claimType, count]) => {
            const config = badgeConfig[claimType];
            if (!config) return null;

            return (
                <div
                    key={claimType}
                    className="relative inline-flex items-center group"
                    title={config.label}
                >
                    <span className={`inline-flex items-center justify-center rounded-md ${config.bgColor} ${config.textColor} p-2 transition-all hover:scale-110`}>
                        {config.icon}
                    </span>
                    {count > 1 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[18px] h-[18px] px-1">
                            {count}
                        </span>
                    )}
                    {/* Tooltip */}
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {config.label}
                    </span>
                </div>
            );
        });

        return <div className="flex flex-wrap items-center gap-2">{allBadges}</div>;
    };

    if (isLoading) {

        return <div className="flex items-center gap-2">
            {/* Circular Loading Spinner */}
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Loading Contacts</span>
        </div>
    }

    return (
        <div className="p-6">
            <h1 className="text-xl font-semibold mb-2">Total Contacts {contactProfiles.length}</h1>

            {filterMultipleAddresses.some(addr => addr.trim() !== '') ?

                <>
                    Filtered Data, Total Contacts {contactProfiles
                        .filter(profile => {
                            // If filterMultipleAddresses has valid entries, filter by them
                            const hasValidFilters = filterMultipleAddresses.some(addr => addr.trim() !== '');
                            if (!hasValidFilters) return true;

                            // Check if profile wallet address matches any filter
                            return filterMultipleAddresses.some(filterAddr =>
                                filterAddr.trim() !== '' &&
                                profile.walletAddress.toLowerCase().includes(filterAddr.toLowerCase())
                            );
                        }).length}
                </>

                :

                <p className="text-sm text-gray-600 mb-6">
                    Found {contactProfiles.length} contact profiles.
                </p>
            }

            {
                contactProfiles.length > 0 ? <div className="my-4 flex gap-4">

                    <WalletAutosuggest

                        walletAddresses={fetchWalletAddressesAndNamesForInputRecommendation(systemFileInfo, workflows)}
                        field={{
                            name: 'address',

                        }}
                        index={0}
                        address={filterMultipleAddresses[0]}
                        multipleAddresses={filterMultipleAddresses}
                        setMultipleAddresses={(addresses: string[]) => {
                            setFilterMultipleAddresses(addresses)
                        }}
                        placeholder="Enter Name Claim | Phone Number Claim | Email clain | Wallet address"
                        className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 flex-1"
                    />
                    {/* <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py- px-4 rounded">
                        Search
                    </button> */}
                </div> : null
            }

            {contactProfiles.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No contact profiles found
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                                    Wallet Address
                                </th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                                    Contact Claims
                                </th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                                    Total Claims
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {contactProfiles
                                .filter(profile => {
                                    // If filterMultipleAddresses has valid entries, filter by them
                                    const hasValidFilters = filterMultipleAddresses.some(addr => addr.trim() !== '');
                                    if (!hasValidFilters) return true;

                                    // Check if profile wallet address matches any filter
                                    return filterMultipleAddresses.some(filterAddr =>
                                        filterAddr.trim() !== '' &&
                                        profile.walletAddress.toLowerCase().includes(filterAddr.toLowerCase())
                                    );
                                }).map((profile, index) => (
                                    <tr
                                        onClick={() => {
                                            navigate(`/app/claims/workflow/${profile.walletAddress}`)
                                        }}
                                        key={index}
                                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <td className="py-3 px-4">
                                            <span className="font-mono text-sm text-gray-900">
                                                {/* {profile.walletAddress.slice(0, 6)}...{profile.walletAddress.slice(-4)} */}

                                                <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                                                    <p className="text-xs ">Profile Owner   {session?.address === profile.walletAddress ? <>(You)</> : <></>}: &nbsp;</p>
                                                    <WalletAdrressClaim walletAddress={profile.walletAddress} />

                                                </div>
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {profileBadges(profile.file)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800">
                                                {profile.file.length}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ContactsPage;