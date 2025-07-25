import { useEffect, useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    FileText,
    MoreHorizontal,
    Eye,
    Trash2,
    Download,
    Send,
    Plus,
} from 'lucide-react'
import appStore from '@/store'
import { useStore } from 'zustand'
import {
    displayTime,
    getAquaTreeFileName,
    getAquaTreeFileObject,
    getGenesisHash,
    isWorkFlowData,
} from '@/utils/functions'
import { FileObject } from 'aqua-js-sdk'
import { DownloadAquaChain } from '../components/aqua_chain_actions/download_aqua_chain'
import { DeleteAquaChain } from '../components/aqua_chain_actions/delete_aqua_chain'
import { Contract, IWorkflowItem } from '@/types/types'
import axios from 'axios'
import { OpenClaimsWorkFlowButton } from '@/components/aqua_chain_actions/open_identity_claim_workflow'
import { useNavigate } from 'react-router-dom'
import { ApiFileInfo } from '@/models/FileInfo'

const WorkflowTableItem = ({
    workflowName,
    apiFileInfo,
    index = 0,
}: IWorkflowItem) => {
    const [currentFileObject, setCurrentFileObject] = useState<
        FileObject | undefined
    >(undefined)
    const navigate = useNavigate()

    const { session, backend_url, files, setSelectedFileInfo } =
        useStore(appStore)

    const [claimName, setClaimName] = useState<string>('')
    const [attestorsCount, setAttestorsCount] = useState<number>(0)
    const [sharedContracts, setSharedContracts] = useState<Contract[] | null>(
        null
    )

    const getCurrentFileObject = () => {
        const fileObject = getAquaTreeFileObject(apiFileInfo)
        setCurrentFileObject(fileObject)
    }

    const getTimeInfo = () => {
        const genRevision = getGenesisHash(apiFileInfo.aquaTree!)
        if (genRevision) {
            const timestamp =
                apiFileInfo.aquaTree?.revisions?.[genRevision]?.local_timestamp
            if (timestamp) {
                return displayTime(timestamp)
            }
        } else {
            return 'Not available'
        }
    }

    // const signers = getSigners()
    // const signersStatus = getSignersStatus()

    const loadSharedContractsData = async (
        _latestRevisionHash: string,
        _genesisHash: string
    ) => {
        try {
            const url = `${backend_url}/contracts`
            const response = await axios.get(url, {
                params: {
                    sender: session?.address,
                    // genesis_hash: genesisHash,
                    latest: _latestRevisionHash,
                },
                headers: {
                    nonce: session?.nonce,
                },
            })
            if (response.status === 200) {
                setSharedContracts(response.data?.contracts)
            }
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        getCurrentFileObject()
        let allHahshes = Object.keys(apiFileInfo.aquaTree?.revisions || {})
        const latestRevisionHash = allHahshes[allHahshes.length - 1]
        const genesisHash = allHahshes[0]

        ;(async () => {
            await loadSharedContractsData(latestRevisionHash, genesisHash)
        })()

        let claimGenHash = getGenesisHash(apiFileInfo.aquaTree!)
        if (!claimGenHash) {
            console.log('No genesis hash found for file:', apiFileInfo)
            return
        }

        // claims name
        let allHashes = Object.keys(apiFileInfo.aquaTree?.revisions || {})
        const firstRevsion = apiFileInfo.aquaTree?.revisions[allHashes[0]]
        if (firstRevsion) {
            let formName = firstRevsion[`forms_name`]
            // console.log(`----------forms name ${formName}`)
            if (formName) {
                setClaimName(formName)
            }
        }

        let attestationsCount = 0
        for (const file of files) {
            // console.log('Processing file:', JSON.stringify(file.aquaTree, null, 4))
            let allHashes = Object.keys(file.aquaTree?.revisions || {})
            if (allHashes.length >= 2) {
                console.log('Found multiple revisions:', allHashes)
                if (allHashes[0] === claimGenHash) {
                    console.log(
                        'Found claim genesis hash match:',
                        claimGenHash,
                        'file item ie same file:'
                    )
                    continue
                }
                const firstRevsion = file.aquaTree?.revisions[allHashes[0]]
                if (!firstRevsion) {
                    console.log(
                        'First revision not found for file:',
                        JSON.stringify(file, null, 4)
                    )
                    continue
                }

                const secondRevsion = file.aquaTree?.revisions[allHashes[1]]
                // console.log(`here..... ${JSON.stringify(secondRevsion, null, 4)}`)
                if (secondRevsion && secondRevsion.revision_type === 'link') {
                    // console.log('Found second revision link:', secondRevsion)
                    const linkVerificationHash =
                        secondRevsion.link_verification_hashes![0]
                    if (!linkVerificationHash) {
                        continue
                    }
                    let fileIndexName =
                        file.aquaTree?.file_index[linkVerificationHash]
                    if (
                        fileIndexName &&
                        fileIndexName == `identity_attestation.json`
                    ) {
                        let claimId = firstRevsion[`forms_identity_claim_id`]
                        // console.log('Found claim ID:', claimId, 'for file item:', fileIndexName)
                        if (claimId.trim() === claimGenHash.trim()) {
                            // console.log('Found attestation for claim:', claimId, 'file item:', fileIndexName)
                            attestationsCount += 1
                        }
                    }
                }
            }
        }
        setAttestorsCount(attestationsCount)
        // const contractInformation = processContractInformation(apiFileInfo)
        // setContractInformation(contractInformation)
    }, [apiFileInfo])

    const openClaimsInforPage = (item: ApiFileInfo) => {
        setSelectedFileInfo(item)
        navigate('/app/claims/workflow')
    }
    return (
        <TableRow
            key={`${workflowName}-${index}`}
            className="hover:bg-muted/50"
        >
            <TableCell
                onClick={() => {
                    openClaimsInforPage(apiFileInfo!!)
                }}
                className="font-medium w-[300px] max-w-[300px] min-w-[300px]"
            >
                <div className="w-full flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                    <div className="flex-grow min-w-0">
                        <div className="font-medium text-sm break-words whitespace-normal">
                            File Name : {currentFileObject?.fileName}
                        </div>
                        <div className="font-medium text-sm break-words whitespace-normal">
                            Claim Name : {claimName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Created at {getTimeInfo()}
                        </div>
                    </div>
                </div>
            </TableCell>

            <TableCell
                onClick={() => {
                    openClaimsInforPage(apiFileInfo!!)
                }}
                className="w-[200px]"
            >
                {attestorsCount}
            </TableCell>
            <TableCell
                onClick={() => {
                    openClaimsInforPage(apiFileInfo!!)
                }}
                className="w-[150px]"
            >
                {sharedContracts?.length}
            </TableCell>

            <TableCell className="text-right w-[100px]">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 cursor-pointer"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <OpenClaimsWorkFlowButton
                            item={apiFileInfo}
                            nonce={session?.nonce ?? ''}
                        >
                            <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Claim
                            </DropdownMenuItem>
                        </OpenClaimsWorkFlowButton>
                        <DropdownMenuItem disabled>
                            <Send className="mr-2 h-4 w-4" />
                            Send Reminder
                        </DropdownMenuItem>
                        <DownloadAquaChain file={apiFileInfo} index={index}>
                            <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </DropdownMenuItem>
                        </DownloadAquaChain>
                        <DropdownMenuSeparator />
                        <DeleteAquaChain
                            apiFileInfo={apiFileInfo}
                            backendUrl={backend_url}
                            nonce={session?.nonce ?? ''}
                            revision=""
                            index={index}
                        >
                            <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DeleteAquaChain>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    )
}

const ClaimsAndAttestationPage = () => {
    const { files, systemFileInfo, setOpenCreateClaimPopUp, session } =
        useStore(appStore)

    const [totalClaims, setTotalClaims] = useState<number>(0)
    const [_totolAttestors, setTotolAttestors] = useState<number>(0)
    const [myAttestions, setMyAttestionss] = useState<number>(0)

    const [workflows, setWorkflows] = useState<IWorkflowItem[]>([])
    const processFilesToGetWorkflows = () => {
        const someData = systemFileInfo.map(e => {
            try {
                return getAquaTreeFileName(e.aquaTree!)
            } catch (e) {
                console.log('Error processing system file') // More descriptive
                return ''
            }
        })

        let totolClaims = 0
        let totolAttestors = 0
        let myAttestions = 0
        const newData: IWorkflowItem[] = []
        // files.forEach(file => {
        for (const file of files) {
            // const fileObject = getAquaTreeFileObject(file);
            const { workFlow, isWorkFlow } = isWorkFlowData(
                file.aquaTree!,
                someData
            )

            if (isWorkFlow && workFlow === 'identity_attestation') {
                totolAttestors += 1
                let allHashes = Object.keys(file.aquaTree?.revisions || {})
                if (allHashes.length >= 2) {
                    const thirdRevision = file.aquaTree?.revisions[allHashes[2]]

                    if (
                        thirdRevision &&
                        thirdRevision.revision_type === 'signature'
                    ) {
                        if (
                            thirdRevision.signature_wallet_address ==
                            session?.address
                        ) {
                            myAttestions += 1
                        }
                    }
                }
            }
            // console.log('Processing file:', JSON.stringify(file.aquaTree!, null,), 'WorkFlow:', workFlow, 'isWorkFlow:', isWorkFlow)
            if (isWorkFlow && workFlow === 'identity_claim') {
                let allHashes = Object.keys(file.aquaTree?.revisions || {})
                if (allHashes.length < 2) {
                    console.log('Not enough revisions for file:', file)
                    continue
                }
                const thirdRevision = file.aquaTree?.revisions[allHashes[2]]

                if (!thirdRevision) {
                    console.log(
                        'Last revision not found for file:',
                        JSON.stringify(file, null, 4)
                    )
                    continue
                }

                if (thirdRevision.revision_type !== 'signature') {
                    console.log(
                        'Last revision is not a signature:',
                        thirdRevision
                    )
                    continue
                }

                if (
                    thirdRevision.signature_wallet_address == session?.address
                ) {
                    console.log(
                        'Signature wallet address matches session address:',
                        thirdRevision.signature_wallet_address,
                        session?.address
                    )
                    const currentName = getAquaTreeFileName(file.aquaTree!)
                    const containsCurrentName: IWorkflowItem | undefined =
                        newData.find((e: IWorkflowItem) => {
                            if (e && e.apiFileInfo && e.apiFileInfo.aquaTree) {
                                const nameItem: string = getAquaTreeFileName(
                                    e.apiFileInfo.aquaTree
                                )
                                return nameItem === currentName
                            }
                        })
                    if (!containsCurrentName) {
                        newData.push({
                            workflowName: workFlow,
                            apiFileInfo: file,
                        })
                    }
                }

                totolClaims += 1
            }
        }

        setTotalClaims(totolClaims)
        setTotolAttestors(totolAttestors)
        setMyAttestionss(myAttestions)
        setWorkflows(newData)
    }

    useEffect(() => {
        processFilesToGetWorkflows()
    }, [JSON.stringify(files)])

    useEffect(() => {
        processFilesToGetWorkflows()
    }, [])

    return (
        <>
            {/* Action Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 hidden">
                <div className="flex items-center justify-between">
                    <div /> {/* Empty div to push the button right */}
                    <div className="flex items-center space-x-4">
                        <button
                            className="flex items-center space-x-2 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 cursor-pointer"
                            style={{ backgroundColor: '#394150' }}
                            onClick={() => {
                                setOpenCreateClaimPopUp(true)
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Claim </span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-6 mt-5">
                <Card className="py-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 justify-between">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    <span>Aqua Claim Workflows</span>
                                </div>
                                <label className="text-sm font-medium text-gray-900  text-left">
                                    Total claims you have attested{' '}
                                    {myAttestions}
                                </label>
                                <label className="text-sm font-medium text-gray-900 mb-4 text-left">
                                    Total claims imported{' '}
                                    {totalClaims - workflows.length}. Claims
                                    created by you {workflows.length}
                                </label>
                            </div>
                            <button
                                className="flex items-center space-x-2 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 cursor-pointer"
                                style={{ backgroundColor: '#394150' }}
                                onClick={() => {
                                    setOpenCreateClaimPopUp(true)
                                }}
                            >
                                <Plus className="w-4 h-4" />
                                <span>New Claim</span>
                            </button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-1">
                        {/* <div className="rounded-md border"> */}
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[300px] max-w-[300px] min-w-[300px] break-words overflow-hidden">
                                            Claim
                                        </TableHead>
                                        {/* <TableHead>Workflow Type</TableHead> */}
                                        <TableHead>Attestors</TableHead>
                                        <TableHead>
                                            Share Contracts created
                                        </TableHead>
                                        {/* <TableHead>Status</TableHead> */}
                                        <TableHead className="text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workflows.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="h-24 text-center"
                                            >
                                                You do not own any claim
                                                workflows
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {workflows.map(
                                        (workflow, index: number) => (
                                            <WorkflowTableItem
                                                key={`${index}-workflow`}
                                                workflowName={
                                                    workflow.workflowName
                                                }
                                                apiFileInfo={
                                                    workflow.apiFileInfo
                                                }
                                                index={index}
                                            />
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}

export default ClaimsAndAttestationPage
