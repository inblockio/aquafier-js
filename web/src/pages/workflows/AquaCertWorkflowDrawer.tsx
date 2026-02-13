import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IAquaCertWorkflowDrawer } from "@/types/types"
import { ensureDomainUrlHasSSL, getAquaTreeFileObject, getFileName } from "@/utils/functions"
import WalletAdrressClaim from "../v2_claims_workflow/WalletAdrressClaim"
import { Button } from "@/components/ui/button"
import { LuX } from "react-icons/lu"
import { Suspense, useEffect, useState } from "react"
import FilePreview from "@/components/file_preview"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import NoAttestationsAlert from "./NoAttestationsAlert"
import { getLinkedFiles } from "@/lib/utils"
import { ApiFileInfo } from "@/models/FileInfo"
import { useStore } from "zustand"
import appStore from "@/store"
import { API_ENDPOINTS } from "@/utils/constants"
import apiClient from '@/api/axiosInstance'
import { AxiosResponse } from 'axios'
import { getLatestVH } from "aqua-js-sdk"
import { AttestAquaClaim } from "@/components/aqua_chain_actions/attest_aqua_claim"
import { Album } from "lucide-react"
import { Alert } from "@/components/ui/alert"

export default function AquaCertWorkflowDrawer({ open, onClose, attestors, fileInfo }: IAquaCertWorkflowDrawer) {
    const { backend_url, session } = useStore(appStore)

    let fileName = getFileName(fileInfo?.aquaTree!)

    const [linkedFileInfos, setLinkedFileInfos] = useState<ApiFileInfo[]>([])
    const [linkedFileNames, setLinkedFileNames] = useState<{ filename: string, index: number }[]>([])


    const generateFileFetchPromis = (targetHash: string) => {
        const url = ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.GET_AQUA_TREE}`)
        const res = apiClient.post(url, {
            revisionHashes: [targetHash]
        }, {
            headers: {
                'Content-Type': 'application/json',
                nonce: session?.nonce,
            },
        })
        return res
    }

    const returnFileInfo = (axiosResp: AxiosResponse): ApiFileInfo => {
        return axiosResp.data.data as ApiFileInfo
    }

    const loadLinkedFiles = async () => {
        if (fileInfo) {
            const linkedFiles = getLinkedFiles(fileInfo!)

            if (linkedFiles.error || !session?.nonce || !backend_url) {
                return
            }

            let aquaTreeFileHashes = linkedFiles.data.linkedVerificationHashes

            let filePromisses = aquaTreeFileHashes.map(generateFileFetchPromis)

            let resolvedPromises = await Promise.all(filePromisses)

            let files: ApiFileInfo[] = resolvedPromises.map(returnFileInfo)

            setLinkedFileInfos(files)

            let linkedFileNames: { filename: string, index: number }[] = files.map((_file, i) => ({ filename: getFileName(_file.aquaTree!), index: i }))
            setLinkedFileNames(linkedFileNames)

        }
    }

    useEffect(() => {
        if (fileInfo) {
            loadLinkedFiles()
        }
    }, [fileInfo])


    return (
        <div className="right">
            <Drawer
                direction={"right"}
                open={open}
                onClose={onClose}
            >
                <DrawerContent className="rounded-tl-2xl rounded-bl-2xl max-w-none! w-[calc(100vw-2rem)]! sm:w-[calc(100vw-4rem)]! md:w-[calc(100vw-6rem)]! h-[calc(100vh-2rem)]! my-auto mr-0">
                    <DrawerHeader>
                        <div className="flex justify-between">
                            <div>
                                <DrawerTitle>{fileName}</DrawerTitle>
                                <DrawerDescription>
                                    Certificate Information
                                </DrawerDescription>
                            </div>
                            <div>
                                <Button variant={"destructive"} onClick={() => onClose && onClose()} className="cursor-pointer">
                                    <LuX />
                                </Button>
                            </div>
                        </div>
                    </DrawerHeader>
                    <div className="no-scrollbar overflow-y-auto px-4 overflow-x-hidden">

                        <Tabs defaultValue="attestations">
                            <TabsList className="w-full">
                                <TabsTrigger value="attestations" className="rounded-xl">Attestations</TabsTrigger>
                                <TabsTrigger value="file_content" className="rounded-xl">File Content</TabsTrigger>
                                <TabsTrigger value="linked_files" className="rounded-xl">Linked Files</TabsTrigger>
                            </TabsList>
                            <TabsContent value="attestations">
                                <div className="flex flex-col gap-2">
                                    <Alert className="border-green-300 bg-green-50 text-green-800">
                                        <div className="flex flex-col gap-2 col-span-full">
                                            <p className="text-sm font-medium">Attest this certificate to confirm its authenticity.</p>
                                            <AttestAquaClaim file={fileInfo!} index={1}>
                                                <Button className='cursor-pointer bg-green-600 hover:bg-green-700 text-white'>
                                                    <Album className="mr-2 h-4 w-4" />
                                                    Attest
                                                </Button>
                                            </AttestAquaClaim>
                                        </div>
                                    </Alert>
                                    {
                                        attestors.length > 0 ? (
                                            <Table className="table-fixed w-full">
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-1/2">Name</TableHead>
                                                        <TableHead className="w-1/2">Context</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {
                                                        attestors.map((attester, index) => (
                                                            <TableRow key={`attestation_${index}`}>
                                                                <TableCell className="truncate max-w-0">
                                                                    <WalletAdrressClaim walletAddress={attester.walletAddress} />
                                                                </TableCell>
                                                                <TableCell className="wrap-break-word" style={{
                                                                    whiteSpace: "wrap"
                                                                }}>
                                                                    {attester.context}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    }

                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <NoAttestationsAlert />
                                        )
                                    }

                                </div>
                            </TabsContent>
                            <TabsContent value="file_content">
                                <Suspense
                                    fallback={
                                        <div className="flex items-center justify-center h-full">
                                            <div className="text-center p-6">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                                <div className="text-gray-600 text-sm">
                                                    Loading file preview...
                                                </div>
                                            </div>
                                        </div>
                                    }
                                >
                                    <FilePreview fileInfo={getAquaTreeFileObject(fileInfo!!)!} latestRevisionHash={getLatestVH(fileInfo?.aquaTree!)} />
                                </Suspense>
                            </TabsContent>
                            <TabsContent value="linked_files">
                                {
                                    linkedFileNames.length > 0 ? (
                                        <Tabs defaultValue={`${linkedFileNames[0].filename}_${linkedFileNames[0].index}`}>
                                            <TabsList className="w-full">
                                                {
                                                    linkedFileNames.map((item, i) => (
                                                        <TabsTrigger key={`${item.filename}_${i}`} value={`${linkedFileNames[i].filename}_${linkedFileNames[i].index}`} className="rounded-xl">{item.filename}</TabsTrigger>
                                                    ))
                                                }
                                            </TabsList>

                                            {
                                                linkedFileNames.map((item, i) => (
                                                    <TabsContent value={`${linkedFileNames[i].filename}_${linkedFileNames[i].index}`} key={`conetnt_${linkedFileNames[i].filename}_${linkedFileNames[i].index}`}>
                                                        <Suspense
                                                            fallback={
                                                                <div className="flex items-center justify-center h-full">
                                                                    <div className="text-center p-6">
                                                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                                                        <div className="text-gray-600 text-sm">
                                                                            Loading file preview...
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            }
                                                        >
                                                            <div className="space-y-1">
                                                                <p className="text-md text-semi-bold">{item.filename}</p>
                                                                <FilePreview fileInfo={getAquaTreeFileObject(linkedFileInfos[i]!!)!} latestRevisionHash={getLatestVH(linkedFileInfos[i].aquaTree!)} />
                                                            </div>
                                                        </Suspense>
                                                    </TabsContent>
                                                ))
                                            }

                                        </Tabs>
                                    ) : (
                                        <NoAttestationsAlert />
                                    )
                                }
                            </TabsContent>
                        </Tabs>
                    </div>
                    {/* <DrawerFooter>
                        <Button>Submit</Button>
                        <DrawerClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter> */}
                </DrawerContent>
            </Drawer>
        </div>
    )
}
