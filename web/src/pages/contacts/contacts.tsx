import { useEffect, useState } from "react";
import appStore from "@/store";
import { useStore } from "zustand";
import { ContactProfile } from "@/types/types";
import { getAquaTreeFileName, isWorkFlowData } from "@/utils/functions";
import { OrderRevisionInAquaTree, Revision } from "aqua-js-sdk";
import { ApiFileInfo } from "@/models/FileInfo";
import WalletAdrressClaim from "../v2_claims_workflow/WalletAdrressClaim";
import { JSX } from "react";

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
    const { files, systemFileInfo, session } = useStore(appStore);
    const [contactProfiles, setContactProfiles] = useState<ContactProfile[]>([]);

    const systemTreeNames = systemFileInfo.map((info) => {
        try {
            return getAquaTreeFileName(info.aquaTree!);
        } catch {
            return "";
        }
    });

    useEffect(() => {
        if (!files?.fileData?.length || !systemFileInfo?.length) return;

        const contactProfileMap = new Map<string, ContactProfile>();

        for (const element of files.fileData) {
            const workFlow = isWorkFlowData(element.aquaTree!, systemTreeNames);
            if (!workFlow.isWorkFlow || !workFlow.workFlow) continue;

            const claimType = workFlow.workFlow;
            if (!CLAIMS.has(claimType)) continue;

            const orderedAquaTree = OrderRevisionInAquaTree(element.aquaTree!);
            const allRevisions = Object.values(orderedAquaTree.revisions);

            const signatureRevision = allRevisions.find(
                (r) => r.revision_type === "signature"
            ) as Revision | undefined;

            if (!signatureRevision?.signature_wallet_address) continue;

            const walletAddress = signatureRevision.signature_wallet_address;
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
    }, [files, systemFileInfo]);

    let profileBadges = (contactProfileFiles: ApiFileInfo[]) => {
        const badgeCounts: Record<string, number> = {};

        for (const element of contactProfileFiles) {
            const workFlow = isWorkFlowData(element.aquaTree!, systemTreeNames);
            if (!workFlow.workFlow) continue;

            const claimType = workFlow.workFlow;
            badgeCounts[claimType] = (badgeCounts[claimType] || 0) + 1;
        }

        const badgeMap: Record<string, JSX.Element> = {
            user_profile: (
                <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 px-2">
                    Badge
                </span>
            ),
            identity_claim: (
                <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 px-2">
                    Name claim
                </span>
            ),
            identity_attestation: (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 px-2">
                    Name attestation
                </span>
            ),
            domain_claim: (
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 px-2">
                    Domain claim
                </span>
            ),
            email_claim: (
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 px-2">
                    Email claim
                </span>
            ),
            phone_number_claim: (
                <span className="inline-flex items-center rounded-md bg-pink-50 px-2 py-1 text-xs font-medium text-pink-700 ring-1 ring-inset ring-pink-700/10 px-2">
                    Phone Number claim
                </span>
            ),
            user_signature: (
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-700/10 px-2">
                    User Signature
                </span>
            ),
        };

        const allBadges = Object.entries(badgeCounts).map(([claimType, count]) => {
            const badgeElement = badgeMap[claimType];
            if (!badgeElement) return null;

            // Clone the badge element and add the count inside it
            return (
                <span key={claimType} className="mr-1 mb-1 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium " style={badgeElement.props.style}>
                    <span className={badgeElement.props.className.split(' ').slice(5).join(' ')}>
                        {badgeElement.props.children}
                        {count > 1 && (
                            <span className="ml-1.5 font-semibold px-1">({count})</span>
                        )}
                    </span>
                </span>
            );
        });

        return <div className="flex flex-wrap items-center gap-1">{allBadges}</div>;
    };

    return (
        <div className="p-6">
            <h1 className="text-xl font-semibold mb-2">Contacts {contactProfiles.length}</h1>
            <p className="text-sm text-gray-600 mb-6">
                Found {contactProfiles.length} contact profiles.
            </p>

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
                            {contactProfiles.map((profile, index) => (
                                <tr 
                                    key={index} 
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <td className="py-3 px-4">
                                        <span className="font-mono text-sm text-gray-900">
                                            {/* {profile.walletAddress.slice(0, 6)}...{profile.walletAddress.slice(-4)} */}

                                              <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                                    <p className="text-xs ">Profile Owner   {session?.address === profile.walletAddress ? <>(You)</> : <></>}: &nbsp;</p>
                                    <WalletAdrressClaim walletAddress={ profile.walletAddress} />

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