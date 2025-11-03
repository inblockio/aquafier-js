import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import appStore from "@/store";
import { ContactProfile } from "@/types/types";
import { getGenesisHash, isWorkFlowData } from "@/utils/functions";
import { OrderRevisionInAquaTree, Revision } from "aqua-js-sdk";
import { ArrowUpAz, Eye, Mail, Phone, Search, Signature, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TbWorld } from "react-icons/tb";
import { useStore } from "zustand";
import WalletAddressProfile from "../v2_claims_workflow/WalletAddressProfile";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { API_ENDPOINTS } from "@/utils/constants";
import { GlobalPagination } from "@/types";
import { ApiFileInfo } from "@/models/FileInfo";
import { ClipLoader } from "react-spinners";


const letters = ['0', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];


const AZRail = ({ onJump, activeLetter }: { onJump: (letter: string) => void, activeLetter: string }) => {

    const getExtraClasses = (letter: string) => {
        if (letter === activeLetter) {
            return "bg-neutral-100 text-neutral-700"
        }
        return ""
    }

    return (
        <nav className="hidden md:flex h-[calc(100%-1rem)] pr-2 z-10">
            <ul className="flex flex-col gap-1 text-[12px] text-neutral-400">
                {letters.map(letter => (
                    <li key={letter}>
                        <button
                            type="button"
                            onClick={() => onJump(letter)}
                            className={`w-6 h-6 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition  focus-visible:outline-neutral-900/20 cursor-pointer ${getExtraClasses(letter)}`}
                        >
                            {letter}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    )
};

interface ContactRowProps {
    contact: ContactProfile
    onSelectAddress: (address: string) => void
}

const ContactRow = ({ contact, onSelectAddress }: ContactRowProps) => {
    const normalizeText = (v: string) => (v || '').toString().trim();

    const truncateAddress = (addr: string) => {
        if (!addr) return '';
        const a = addr.trim();
        if (a.length <= 14) return a;
        return `${a.slice(0, 10)}…${a.slice(-6)}`;
    };

    const displayName = (c: ContactProfile) => {
        const nm = normalizeText(c.name ?? "");
        if (nm) return nm;
        return truncateAddress(c.walletAddress);
    };

    const nm = normalizeText(contact.name ?? "");
    const avatar = nm ? nm[0].toUpperCase() : '0';
    const title = displayName(contact);
    const subtle = nm ? truncateAddress(contact.walletAddress) : '';
    const meta = [contact.phone, contact.email].filter(Boolean).join(' • ') || (nm ? '' : 'Wallet');

    const renderClaimIcon = (claimType: "identity_claim" | "email_claim" | "phone_number_claim" | "user_signature" | "domain_claim") => {
        switch (claimType) {
            case "identity_claim":
                return <User className="w-5 h-5" />
            case "email_claim":
                return <Mail className="w-5 h-5" />
            case "phone_number_claim":
                return <Phone className="w-5 h-5" />
            case "user_signature":
                return <Signature className="w-5 h-5" />
            case "domain_claim":
                return <TbWorld className="w-5 h-5" />
            default:
                return <User className="w-5 h-5" />
        }
    }

    const getClaimType = (claimType: "identity_claim" | "email_claim" | "phone_number_claim" | "user_signature" | "domain_claim") => {
        switch (claimType) {
            case "identity_claim":
                return "Identity"
            case "email_claim":
                return "Email"
            case "phone_number_claim":
                return "Phone"
            case "user_signature":
                return "Signature"
            case "domain_claim":
                return "Domain"
            default:
                return "Unknown"
        }
    }

    const totalClaims = () => {
        let total = 0;
        Object.keys(contact.claims).forEach((claimType) => {
            total += contact.claims[claimType].length;
        });
        return total;
    }


    return (
        <>
            <div className="grid sm:grid-cols-4 px-2 md:px-4 py-3 border-b border-neutral-100 gap-2">

                <div className="col-span-2">
                    <div className="flex items-center min-w-0 gap-3">
                        <div className="relative h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 border border-neutral-200 flex items-center justify-center text-sm font-medium text-neutral-700">
                            {avatar}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="truncate text-[15px] font-medium text-neutral-900">{title}</p>
                                {subtle && <span className="hidden sm:inline-block text-[11px] font-normal text-neutral-400">{subtle}</span>}
                            </div>
                            <p className="truncate text-[13px] text-neutral-500">{meta}</p>
                        </div>
                    </div>
                </div>

                <div className="col-span-1">
                    <div className="flex items-center gap-2">
                        {
                            Object.keys(contact.claims).map((claimType) => {
                                return (
                                    <div
                                        key={`${claimType}-${contact.walletAddress}`}
                                    >
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <div
                                                    className={`inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2 py-2 text-xs text-neutral-600 hover:bg-neutral-50 focus-visible:outline-neutral-900/20`}
                                                >
                                                    {renderClaimIcon(claimType as any)}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{getClaimType(claimType as any)}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                )
                            })
                        }
                        {totalClaims() > 1 ? (
                            <>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <div
                                            className={`inline-flex font-bold items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2.5 text-xs text-neutral-600 hover:bg-neutral-50 focus-visible:outline-neutral-900/20`}
                                        >
                                            {totalClaims()}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{totalClaims()} Claims</p>
                                    </TooltipContent>
                                </Tooltip>
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="col-span-1">
                    <div className="flex gap-2 justify-end">
                        {/* <button
                            onClick={handleCall}
                            disabled={true}
                            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 focus-visible:outline-neutral-900/20 ${!contact.phone ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Share2 />
                            Share
                        </button> */}
                        <button
                            onClick={() => onSelectAddress(contact.walletAddress)}
                            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 focus-visible:outline-neutral-900/20`}
                        >
                            <Eye />
                            view
                        </button>
                    </div>
                </div>

            </div>
        </>
    );
};

const GroupHeader = ({ letter }: { letter: string }) => {
    return (
        <div id={`group-${letter}`} className="sticky top-0 z-10 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-neutral-100">
            <h3 className="px-4 py-2 text-sm font-medium tracking-tight text-neutral-500">{letter}</h3>
        </div>
    )
}

const CLAIMS = new Set([
    "user_profile",
    "identity_claim",
    "identity_attestation",
    "domain_claim",
    "email_claim",
    "phone_number_claim",
    "user_signature",
]);


const ContactsTable = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortAsc, setSortAsc] = useState(true);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [activeLetter, setActiveLetter] = useState('0');

    const normalizeText = (v: string) => (v || '').toString().trim();
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

    const { session, backend_url } = useStore(appStore);
    const [contactProfiles, setContactProfiles] = useState<ContactProfile[]>([]);

    const [files, setFiles] = useState<ApiFileInfo[]>([])
    const [currentPage, _setCurrentPage] = useState(1)
    const [_pagination, setPagination] = useState<GlobalPagination | null>(null)
    const [loading, setLoading] = useState(true)
    const [isProcessingClaims, setIsProcessingClaims] = useState(true)

    const [systemAquaFileNames, setSystemAquaFileNames] = useState<string[]>([])

    const loadSystemAquaFileNames = async () => {
        if (!session?.nonce) return
        try {
            const response = await axios.get(`${backend_url}/${API_ENDPOINTS.SYSTEM_AQUA_FILES_NAMES}`, {
                headers: {
                    'nonce': session.nonce,
                    'metamask_address': session.address
                }
            })
            setSystemAquaFileNames(response.data.data)
        } catch (error) {
            console.log("Error getting system aqua file names", error)
        }
    }


    // const navigate = useNavigate()

    const groupKey = (c: ContactProfile) => {
        const nm = normalizeText(c.name ?? "");
        if (nm) {
            const ch = nm[0].toUpperCase();
            return /[A-Z]/.test(ch) ? ch : '0';
        }
        return '0';
    };

    const filterContacts = (query: string) => {
        if (!query) return contactProfiles.slice();
        const q = query.toLowerCase();
        return contactProfiles.filter(c => {
            // return [c.name ?? "", c.walletAddress, c.phone, c.email, c.searchString].some(
            //     v => (v || '').toLowerCase().includes(q)
            // );
            return `${c.name ?? ""} ${c.walletAddress ?? ""} ${c.phone ?? ""} ${c.email ?? ""} ${c.searchString ?? ""}`.toLowerCase().includes(q)
        });
    };

    const sortWithinGroup = (list: ContactProfile[]) => {
        list.sort((a, b) => {
            const aKey = normalizeText(a.name ?? "") || a.walletAddress || '';
            const bKey = normalizeText(b.name ?? "") || b.walletAddress || '';
            return sortAsc ? aKey.localeCompare(bKey) : bKey.localeCompare(aKey);
        });
    };

    const buildGroups = (items: ContactProfile[]) => {
        const map: Record<string, ContactProfile[]> = Object.fromEntries(letters.map(l => [l, []]));
        items.forEach(c => {
            const key = groupKey(c);
            if (!map[key]) map[key] = [];
            map[key].push(c);
        });
        letters.forEach(l => sortWithinGroup(map[l]));
        return map;
    };

    const groupedContacts = useMemo(() => {
        const filtered = filterContacts(searchQuery);
        return buildGroups(filtered);
    }, [searchQuery, sortAsc, contactProfiles]);

    const totalContacts = useMemo(() => {
        return Object.values(groupedContacts).reduce((sum, group) => sum + group.length, 0);
    }, [groupedContacts]);

    const handleJumpTo = (letter: string) => {
        const target = document.getElementById(`group-${letter}`);
        if (!target || !scrollerRef.current) return;
        setActiveLetter(letter);
        const top = target.offsetTop - 4;
        scrollerRef?.current?.scrollTo({ top, behavior: 'smooth' });
    };

    const toggleSort = () => {
        setSortAsc(!sortAsc);
    };

    const loadContactTrees = async () => {
        if (!session?.address || !backend_url) return;
        setLoading(true)
        const params = {
            page: currentPage,
            limit: 200,
            claim_types: JSON.stringify(['identity_claim', 'user_signature', 'identity_attestation', 'email_claim', 'phone_number_claim', 'domain_claim']),
            // wallet_address: session?.address
        }
        const filesDataQuery = await axios.get(`${backend_url}/${API_ENDPOINTS.GET_PER_TYPE}`, {
            headers: {
                'Content-Type': 'application/json',
                'nonce': `${session!.nonce}`
            },
            params
        })
        const response = filesDataQuery.data
        const aquaTrees = response.aquaTrees
        setPagination(response.pagination)
        setFiles(aquaTrees)
        setLoading(false)
        //   processFilesToWorkflowUi(aquaTrees)
    }

    const generateContacts = async () => {

        if (!files?.length || !systemAquaFileNames?.length) return;

        const contactProfileMap = new Map<string, ContactProfile>();
        setIsProcessingClaims(true)

        // Process files in parallel
        const processFile = async (element: ApiFileInfo) => {
            const workFlow = isWorkFlowData(element.aquaTree!, systemAquaFileNames);
            if (!workFlow.isWorkFlow || !workFlow.workFlow) return null;

            const claimType = workFlow.workFlow;
            if (!CLAIMS.has(claimType)) return null;

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

                if (!signatureRevision?.signature_wallet_address) return null;

                walletAddress = signatureRevision.signature_wallet_address;
            }

            let claimValue: string = ""
            let genHash = getGenesisHash(element.aquaTree!)

            if (genHash) {
                let genRevision = element.aquaTree!.revisions[genHash]

                const claimFieldMap: Record<string, string> = {
                    "identity_claim": "forms_name",
                    "email_claim": "forms_email",
                    "phone_number_claim": "forms_phone_number",
                    "user_signature": "forms_wallet_address",
                    "domain_claim": "forms_domain"
                }

                const fieldName = claimFieldMap[claimType]
                if (fieldName && genRevision[fieldName]) {
                    claimValue = genRevision[fieldName]
                }
            }

            let searchText = ""

            if (genHash) {
                let genRevision = element.aquaTree!.revisions[genHash]

                const claimSearchFieldsMap: Record<string, string[]> = {
                    "identity_claim": ["forms_name", "forms_wallet_address"],
                    "phone_number_claim": ["forms_phone_number", "forms_wallet_address"],
                    "email_claim": ["forms_email", "forms_wallet_address"],
                    "user_signature": ["forms_wallet_address", "forms_name"],
                    "domain_claim": ["forms_domain", "forms_wallet_address"],
                    "identity_attestation": ["forms_context", "forms_wallet_address"]
                }

                const searchFields = claimSearchFieldsMap[claimType]
                if (searchFields) {
                    for (const field of searchFields) {
                        if (genRevision[field]) {
                            searchText += genRevision[field] + " ";
                        }
                    }
                }
            }

            return {
                walletAddress,
                claimType,
                claimValue,
                searchText,
                element
            };
        };

        try {
            // Process all files in parallel
            const processedFiles = await Promise.all(files.map(processFile));
            
            // Filter out null results and merge into contact profiles
            const validResults = processedFiles.filter(result => result !== null);
            
            for (const result of validResults) {
                const { walletAddress, claimType, claimValue, searchText, element } = result!;
                
                let existingProfile = contactProfileMap.get(walletAddress);

                if (existingProfile) {
                    existingProfile.file.push(element);

                    // Update name if current name is empty and we have a new name
                    if (existingProfile.name === "" && claimType === "identity_claim") {
                        existingProfile.name = claimValue;
                    }
                    if (existingProfile.phone === "" && claimType === "phone_number_claim") {
                        existingProfile.phone = claimValue;
                    }
                    if (existingProfile.email === "" && claimType === "email_claim") {
                        existingProfile.email = claimValue;
                    }

                    // ALWAYS update claims if we have a claim value (moved outside name condition)
                    if (claimValue) {
                        if (existingProfile.claims[claimType]) {
                            existingProfile.claims[claimType].push(claimValue);
                        } else {
                            existingProfile.claims[claimType] = [claimValue];
                        }
                    }
                    // Update search string
                    existingProfile.searchString = existingProfile.searchString + " " + searchText
                    contactProfileMap.set(walletAddress, existingProfile);

                } else {
                    if (walletAddress) {
                        contactProfileMap.set(walletAddress, {
                            walletAddress,
                            file: [element],
                            name: claimType === "identity_claim" ? claimValue : "",
                            phone: claimType === "phone_number_claim" ? claimValue : "",
                            email: claimType === "email_claim" ? claimValue : "",
                            searchString: searchText,
                            claims: {
                                ...(claimValue ? { [claimType]: [claimValue] } : {})
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error processing contacts in parallel:', error);
        }
        
        setIsProcessingClaims(false)
        setContactProfiles(Array.from(contactProfileMap.values()));
    }

    const handleSelectAddress = (address: string) => {
        setSelectedAddress(address);
        setOpenDialog(true);
    };

    const watchFilesChange = useMemo(() => {
        if (!files?.length) return '0';

        let totalRevisions = 0;
        let aquaTreeHashes: string[] = [];

        for (const file of files) {
            if (file.aquaTree?.revisions) {
                const revisionCount = Object.keys(file.aquaTree.revisions).length;
                totalRevisions += revisionCount;

                // Create a stable identifier for this aquaTree based on its revisions
                const revisionKeys = Object.keys(file.aquaTree.revisions).sort();
                const aquaTreeHash = `${revisionCount}-${revisionKeys.join(',')}`;
                aquaTreeHashes.push(aquaTreeHash);
            }
        }

        // Create a stable watch value based on total revisions and aquaTree structure
        return `${totalRevisions}-${aquaTreeHashes.sort().join('|')}`;
    }, [files]);

    useEffect(() => {
        loadContactTrees()
    }, [currentPage, backend_url, JSON.stringify(session)]);

    useEffect(() => {
        loadSystemAquaFileNames()
    }, [session?.nonce]);

    useEffect(() => {
        generateContacts()
    }, [watchFilesChange, systemAquaFileNames]);

    return (
        <>
            <div className="mx-auto max-w-6xl px-0 sm:px-4 py-2">
                <header className="mb-6">
                    <h1 className="text-2xl tracking-tight font-semibold text-neutral-900">
                        Contacts
                    </h1>
                    <p className="text-sm text-neutral-500">
                        Search by name, wallet, phone, email, or identity contexts. Items without a name appear under
                        “0”.
                    </p>
                </header>
                <section className="bg-white border border-neutral-200 rounded-2xl shadow-sm">
                    {/* Toolbar */}
                    <div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4">
                            <div className="relative flex-1">
                                <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
                                    <Search className="w-5 h-5" />
                                </span>
                                <input
                                    id="searchInput"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    type="text"
                                    placeholder="Search contacts or attributes (e.g., phone)..."
                                    className="w-full rounded-xl border border-neutral-300 bg-white/80 pl-10 pr-4 py-2.5 text-[15px] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    id="sortBtn"
                                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-neutral-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-neutral-800 active:bg-neutral-900 transition"
                                    onClick={toggleSort}
                                >
                                    <ArrowUpAz className="w-4 h-4" />
                                    <span id="sortLabel">Sort A-Z</span>
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-neutral-500 px-4 pb-4">
                            Total contacts: {totalContacts}
                        </p>
                    </div>

                    <div className="relative">
                        <div className="flex gap-0 h-fit md:h-[70vh]">
                            {/* List */}
                            <div className="flex-1 h-full">
                                <div className="relative h-full">
                                    <div
                                        ref={scrollerRef}
                                        className="h-full overflow-y-auto overscroll-contain border-t border-neutral-100"
                                    >
                                        {
                                            loading ? <div className="py-6 flex flex-col items-center justify-center h-full w-full">
                                                <ClipLoader color="#000" loading={loading} size={50} />
                                                <p className="text-sm">Loading...</p>
                                            </div> : null
                                        }
                                        {(totalContacts === 0 && !loading && !isProcessingClaims) ? (
                                            <div className="p-8 text-center text-neutral-500 text-sm flex flex-col gap-4">
                                                <p> No contacts found.</p>
                                                {
                                                    searchQuery ? (
                                                        <>
                                                            <p>Try a different search term.</p>
                                                            <p>Current search: <span className="font-semibold text-neutral-800">{searchQuery}</span></p>
                                                        </>
                                                    ) : null
                                                }
                                            </div>
                                        ) : (
                                            <div>
                                                {letters.map(letter => {
                                                    const group = groupedContacts[letter];
                                                    if (!group || group.length === 0) return null;

                                                    return (
                                                        <div key={letter}>
                                                            <GroupHeader letter={letter} />
                                                            {group.map((contact, idx) => (
                                                                <ContactRow
                                                                    key={`${letter}-${idx}-${contact.walletAddress}`}
                                                                    contact={contact}
                                                                    onSelectAddress={handleSelectAddress}
                                                                />
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="h-full px-0 md:px-2 overflow-y-auto"> {/* Changed from col-span-1 to just h-full */}
                                {/* A–Z Rail */}
                                <AZRail onJump={handleJumpTo} activeLetter={activeLetter} />
                            </div>
                        </div>
                    </div>

                </section>
            </div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                {/* <DialogTrigger>Open</DialogTrigger> */}
                <DialogContent className="rounded-2xl max-w-[90%] md:max-w-[400px] px-2 md:px-4">
                    <DialogHeader>
                        <DialogTitle>Profile</DialogTitle>
                        <DialogDescription style={{
                            minHeight: "max(400px, fit-content)"
                        }}>
                            {selectedAddress ? (
                                <WalletAddressProfile walletAddress={selectedAddress} />
                            ) : null}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default ContactsTable