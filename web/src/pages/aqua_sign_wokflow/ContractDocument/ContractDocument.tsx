import React, { useEffect, useState } from 'react'
import appStore from '../../../store'
import { useStore } from 'zustand'
import {
    ContractDocumentViewProps,
    SignatureData,
    SummaryDetailsDisplayData,
} from '../../../types/types'
import {
    AquaTree,
    getGenesisHash,
    OrderRevisionInAquaTree,
    reorderAquaTreeRevisionsProperties,
    Revision,
} from 'aqua-js-sdk/web'
import {
    ensureDomainUrlHasSSL,
    getHighestFormIndex,
    isAquaTree,
} from '../../../utils/functions'

import { PDFDisplayWithJustSimpleOverlay } from './components/signature_overlay'
import { toast } from 'sonner'
import PdfSigner from './PdfSigner'
import SignatureItem from '../../../components/pdf/SignatureItem'

export const ContractDocumentView: React.FC<ContractDocumentViewProps> = ({
    setActiveStep,
}) => {
    const [pdfLoadingFile, setLoadingPdfFile] = useState<boolean>(true)
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [pdfURLObject, setPdfURLObject] = useState<string | null>(null)
    const [signatures, setSignatures] = useState<SignatureData[]>([])
    // const [signaturesData, setSignaturesData] = useState<SignatureData[]>([]);
    const [signaturesLoading, setSignaturesLoading] = useState<boolean>(false)
    // const [userCanSign, setUserCanSign] = useState<boolean>(false);
    // const [authorizedSigners, setAuthorizedSigners] = useState<string[]>([]);
    const { selectedFileInfo, session, backend_url } = useStore(appStore)

    useEffect(() => {
        initializeComponent()
    }, [])

    // useEffect(() => {
    //     initializeComponent()
    // }, [JSON.stringify(selectedFileInfo), selectedFileInfo])

    const getSignatureRevionHashes = (
        hashesToLoopPar: Array<string>
    ): Array<SummaryDetailsDisplayData> => {
        const signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

        for (let i = 0; i < hashesToLoopPar.length; i += 3) {
            const batch = hashesToLoopPar.slice(i, i + 3)
            //  // console.log(`Processing batch ${i / 3 + 1}:`, batch);

            let signaturePositionCount = 0
            const hashSigPosition = batch[0] ?? ''
            const hashSigRev = batch[1] ?? ''
            const hashSigMetamak = batch[2] ?? ''
            let walletAddress = ''

            if (hashSigPosition.length > 0) {
                const allAquaTrees = selectedFileInfo?.fileObject.filter(e =>
                    isAquaTree(e.fileContent)
                )

                const hashSigPositionHashString =
                    selectedFileInfo!.aquaTree!.revisions[hashSigPosition]
                        .link_verification_hashes![0]

                if (allAquaTrees) {
                    for (const anAquaTree of allAquaTrees) {
                        const allHashes = Object.keys(anAquaTree)
                        if (allHashes.includes(hashSigPositionHashString)) {
                            const aquaTreeData =
                                anAquaTree.fileContent as AquaTree
                            const revData =
                                aquaTreeData.revisions[
                                    hashSigPositionHashString
                                ]
                            signaturePositionCount =
                                getHighestFormIndex(revData)

                            break
                        }
                    }
                }
            }

            const metaMaskRevision =
                selectedFileInfo!.aquaTree!.revisions[hashSigMetamak]
            if (metaMaskRevision) {
                walletAddress = metaMaskRevision.signature_wallet_address ?? ''
            }
            const data: SummaryDetailsDisplayData = {
                revisionHashWithSignaturePositionCount: signaturePositionCount,
                revisionHashWithSignaturePosition: hashSigPosition,
                revisionHashWithSinatureRevision: hashSigRev,
                revisionHashMetamask: hashSigMetamak,
                walletAddress: walletAddress,
            }

            signatureRevionHashes.push(data)
        }

        return signatureRevionHashes
    }

    const fetchImage = async (fileUrl: string) => {
        try {
            const actualUrlToFetch = ensureDomainUrlHasSSL(fileUrl)
            const response = await fetch(actualUrlToFetch, {
                headers: {
                    nonce: `${session?.nonce}`,
                },
            })

            if (!response.ok) {
                console.error(
                    'FFFailed to fetch file:',
                    response.status,
                    response.statusText
                )
                return null
            }

            // Get content type from headers
            let contentType = response.headers.get('Content-Type') || ''
            // console.log("fetched: ", response, "content type:", contentType);

            // If content type is missing or generic, try to detect from URL
            if (
                contentType === 'application/octet-stream' ||
                contentType === ''
            ) {
                contentType = 'image/png'
            }

            if (contentType.startsWith('image')) {
                const arrayBuffer = await response.arrayBuffer()
                // Ensure we use the PDF content type
                const blob = new Blob([arrayBuffer], { type: contentType })
                return URL.createObjectURL(blob)
            }

            return null
        } catch (error) {
            console.error('Error fetching file:', error)
            return null
        }
    }

    const findImageUrl = (fileHash: string): string | null => {
        for (const fileObject of selectedFileInfo!.fileObject) {
            const fileContent = fileObject.fileContent

            if (
                typeof fileContent === 'string' &&
                fileContent.includes(fileHash)
            ) {
                return fileContent
            }
        }

        const actualUrlToFetch = ensureDomainUrlHasSSL(backend_url)

        return `${actualUrlToFetch}/files/${fileHash}`
    }
    const loadSignatures = async (): Promise<SignatureData[]> => {
        const sigData: SignatureData[] = []
        const orderedTree = OrderRevisionInAquaTree(selectedFileInfo!.aquaTree!)
        const revisions = orderedTree.revisions
        const revisionHashes = Object.keys(revisions)
        let fourthItmeHashOnwards: string[] = []
        let signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

        if (revisionHashes.length > 4) {
            // remove the first 4 elements from the revision list
            fourthItmeHashOnwards = revisionHashes.slice(4)

            console.log(
                `fourthItmeHashOnwards data 00 ${JSON.stringify(fourthItmeHashOnwards, null, 4)}`
            )
            signatureRevionHashes = getSignatureRevionHashes(
                fourthItmeHashOnwards
            )
        }

        console.log(
            `signatureRevionHashes data 00 ${JSON.stringify(signatureRevionHashes, null, 4)}`
        )

        for (const sigHash of signatureRevionHashes) {
            console.log(`looping  ${JSON.stringify(sigHash, null, 2)}`)

            const revisionSigImage =
                selectedFileInfo!.aquaTree!.revisions[
                    sigHash.revisionHashWithSinatureRevision
                ]
            const linkRevisionWithSignaturePositions: Revision =
                selectedFileInfo!.aquaTree!.revisions[
                    sigHash.revisionHashWithSignaturePosition
                ]
            const revisionMetMask: Revision =
                selectedFileInfo!.aquaTree!.revisions[
                    sigHash.revisionHashMetamask
                ]

            // const fileHash = revisionSigImage.link_file_hashes![0]!;
            // console.log(`fileHash ${fileHash}`)
            // get the name
            const referenceRevisin: string =
                revisionSigImage.link_verification_hashes![0]
            let name = 'name-err'
            let imageDataUrl = ''
            for (const item of selectedFileInfo?.fileObject ?? []) {
                const isAquaTreeItem = isAquaTree(item.fileContent)
                // console.log(`isAquaTreeItem ${isAquaTreeItem} loopin gfile objects ${JSON.stringify(item, null, 4)}`)
                if (isAquaTreeItem) {
                    //  // console.log(`looping aqua tree`)
                    const aquaTreeGeneral = item.fileContent as AquaTree
                    const aquaTree =
                        reorderAquaTreeRevisionsProperties(aquaTreeGeneral)
                    const allHashes = Object.keys(aquaTree.revisions)
                    //  // console.log(`looping aqua tree allHashes ${allHashes}`)
                    if (allHashes.includes(referenceRevisin)) {
                        const genesisHash = getGenesisHash(aquaTree)!
                        // console.log(`include genesisHash ${genesisHash}`)
                        const genRevision = aquaTree.revisions[genesisHash]
                        name = genRevision['forms_name']

                        //the image url
                        //seconnd last or 3 one
                        const signatureRevisionHash: string = allHashes[2]
                        const signatureRevision: Revision =
                            aquaTree.revisions[signatureRevisionHash]
                        if (signatureRevision.revision_type != 'link') {
                            throw Error(`Error expected link`)
                        }
                        const imgFileHash =
                            signatureRevision.link_file_hashes![0]
                        const imageUrl = findImageUrl(imgFileHash)
                        console.log(
                            `findImageUrl ${imgFileHash} ==  ${imageUrl}`
                        )
                        if (imageUrl) {
                            console.log(` imageUrl ==  ${imageUrl}`)
                            const image = await fetchImage(imageUrl)
                            if (image) {
                                imageDataUrl = image
                            } else {
                                // Read default preview image from public folder and convert to data URL
                                try {
                                    const response = await fetch('/preview.png')
                                    if (response.ok) {
                                        const blob = await response.blob()
                                        imageDataUrl =
                                            await new Promise<string>(
                                                resolve => {
                                                    const reader =
                                                        new FileReader()
                                                    reader.onloadend = () =>
                                                        resolve(
                                                            reader.result as string
                                                        )
                                                    reader.readAsDataURL(blob)
                                                }
                                            )
                                    }
                                } catch (error) {
                                    console.error(
                                        'Error loading preview.png:',
                                        error
                                    )
                                    imageDataUrl = 'errror' // fallback to empty string
                                }
                            }
                        }
                        break
                    }
                }
            }

            let revisionSigPosition: Revision | null = null

            const revisionHashWithPositions =
                linkRevisionWithSignaturePositions.link_verification_hashes![0]
            console.log(`revisionSigPosition === ${revisionHashWithPositions}`)

            for (const item of selectedFileInfo?.fileObject ?? []) {
                const isAquaTreeItem = isAquaTree(item.fileContent)
                if (isAquaTreeItem) {
                    const aquaTreeGeneral = item.fileContent as AquaTree
                    const aquaTree =
                        reorderAquaTreeRevisionsProperties(aquaTreeGeneral)
                    const allHashes = Object.keys(aquaTree.revisions)
                    //  // console.log(`looping aqua tree allHashes ${allHashes}`)
                    if (allHashes.includes(revisionHashWithPositions)) {
                        revisionSigPosition =
                            aquaTree.revisions[revisionHashWithPositions]
                    }
                }
            }

            if (revisionSigPosition != null) {
                console.log(
                    `revisionSigPosition ==  sigHash.revisionHashWithSignaturePositionCount == > ${sigHash.revisionHashWithSignaturePositionCount}=== ${JSON.stringify(revisionSigPosition, null, 4)}`
                )
                if (sigHash.revisionHashWithSignaturePositionCount == 0) {
                    const signatureDetails: SignatureData = {
                        id: sigHash.revisionHashWithSignaturePosition, // Use the hash key instead of revision.revision_hash
                        height: revisionSigPosition.forms_height_0,
                        width: revisionSigPosition.forms_width_0,
                        x: revisionSigPosition.forms_x_0,
                        y: revisionSigPosition.forms_y_0,
                        page: revisionSigPosition.forms_page_0,
                        name: name,
                        walletAddress:
                            revisionMetMask.signature_wallet_address ?? 'error',
                        // ISSUE 2: created_at doesn't exist, use local_timestamp instead
                        createdAt: new Date(
                            revisionSigPosition.local_timestamp
                                ? `${revisionSigPosition.local_timestamp.slice(0, 4)}-${revisionSigPosition.local_timestamp.slice(4, 6)}-${revisionSigPosition.local_timestamp.slice(6, 8)}T${revisionSigPosition.local_timestamp.slice(8, 10)}:${revisionSigPosition.local_timestamp.slice(10, 12)}:${revisionSigPosition.local_timestamp.slice(12, 14)}`
                                : Date.now()
                        ),
                        dataUrl: imageDataUrl,
                        hash: sigHash.revisionHashWithSignaturePosition, // Use the hash key
                        isDragging: false,
                        signatureId: sigHash.revisionHashWithSignaturePosition, // Use the hash key
                        type: 'signature',
                        imageWidth: 100,
                        imageHeight: 120,
                        imageAlt: 'err -img not found',
                        rotation: 0,
                    }
                    sigData.push(signatureDetails)
                } else {
                    const randomArray = Array.from(
                        {
                            length:
                                sigHash.revisionHashWithSignaturePositionCount +
                                1,
                        },
                        () => Math.random()
                    )
                    for (let index = 0; index < randomArray.length; index++) {
                        // console.log(`Looping  ${index}`)
                        const signatureDetails: SignatureData = {
                            id: `${sigHash.revisionHashWithSignaturePosition}_${index}`, // Make unique IDs for multiple signatures
                            height: revisionSigPosition[
                                `forms_height_${index}`
                            ],
                            width: revisionSigPosition[`forms_width_${index}`],
                            x: revisionSigPosition[`forms_x_${index}`],
                            y: revisionSigPosition[`forms_y_${index}`],
                            page: revisionSigPosition[`forms_page_${index}`],
                            name: name,
                            walletAddress:
                                revisionMetMask.signature_wallet_address ??
                                'error',
                            createdAt: new Date(
                                revisionSigPosition.local_timestamp
                                    ? `${revisionSigPosition.local_timestamp.slice(0, 4)}-${revisionSigPosition.local_timestamp.slice(4, 6)}-${revisionSigPosition.local_timestamp.slice(6, 8)}T${revisionSigPosition.local_timestamp.slice(8, 10)}:${revisionSigPosition.local_timestamp.slice(10, 12)}:${revisionSigPosition.local_timestamp.slice(12, 14)}`
                                    : Date.now()
                            ),
                            dataUrl: imageDataUrl,
                            hash: sigHash.revisionHashWithSignaturePosition,
                            isDragging: false,
                            signatureId: `${sigHash.revisionHashWithSignaturePosition}_${index}`, // Make unique signature IDs
                            type: 'signature',
                            imageWidth: 100,
                            imageHeight: 120,
                            imageAlt: 'error -img not found.',
                            rotation: 0,
                        }
                        sigData.push(signatureDetails)
                    }
                }
            } else {
                console.log(
                    `signature positions not found   searchiong for gensis ${revisionHashWithPositions} `
                )
                // we try with fetching the image
                //  ......
            }
        }

        // console.log(`sigData length  ${JSON.stringify(sigData, null, 4)}`)
        return sigData
    }

    const initializeComponent = async () => {
        try {
            console.log(`initializeComponent ...`)
            if (pdfFile == null) {
                console.log(`null......`)
                // Load PDF first
                const pdfFile = await fetchPDFfile()

                console.log(`pdfFile ......${pdfFile}`)
                setPdfFile(pdfFile)
                setLoadingPdfFile(false)

                const shouldLoad = shouldLoadSignatures()
                console.log(`Should load ${shouldLoad + '='} ....`)

                if (shouldLoad) {
                    setSignaturesLoading(true)
                    const allSignatures: SignatureData[] =
                        await loadSignatures()
                    console.log(
                        `allSignatures in pdf  ${JSON.stringify(allSignatures, null, 2)}`
                    )
                    setSignatures(allSignatures)
                    setSignaturesLoading(false)
                }
            }
        } catch (error) {
            console.error('Error initializing component:', error)
            setLoadingPdfFile(false)
            setSignaturesLoading(false)
        }
    }

    const fetchPDFfile = async (): Promise<File | null> => {
        try {
            console.log(`fetchPDFfile......1`)
            if (!selectedFileInfo?.aquaTree?.revisions) {
                throw new Error('Selected file info or revisions not found')
            }

            console.log(`fetchPDFfile......2`)
            const allHashes = Object.keys(selectedFileInfo.aquaTree.revisions)
            const pdfLinkRevision =
                selectedFileInfo.aquaTree.revisions[allHashes[2]]

            if (!pdfLinkRevision?.link_verification_hashes?.[0]) {
                throw new Error('PDF link revision not found')
            }

            console.log(`fetchPDFfile......3`)
            const pdfHash = pdfLinkRevision.link_verification_hashes[0]
            const pdfName = selectedFileInfo.aquaTree.file_index?.[pdfHash]

            if (!pdfName) {
                throw new Error('PDF name not found in index')
            }

            const pdfFileObject = selectedFileInfo.fileObject.find(
                e => e.fileName === pdfName
            )

            console.log(`fetchPDFfile......4`)
            if (!pdfFileObject) {
                throw new Error('PDF file object not found')
            }

            const fileContentUrl = pdfFileObject.fileContent
            // console.log(`fetchPDFfile......4.5 ${typeof fileContentUrl} --  ${JSON.stringify(fileContentUrl, null, 4)}`)
            console.log(`fetchPDFfile......4.5  ${typeof fileContentUrl}`)
            if (
                typeof fileContentUrl === 'string' &&
                fileContentUrl.startsWith('http')
            ) {
                return await fetchFileFromUrl(fileContentUrl, pdfName)
            }

            // Handle object that might be binary data (like PDF bytes)
            if (typeof fileContentUrl === 'object' && fileContentUrl !== null) {
                console.log(`fetchPDFfile......4.6 handling object data`)

                // Check if it's an array-like object with numeric indices (like your example)
                if (
                    Object.keys(fileContentUrl).every(
                        key => !isNaN(Number(key))
                    )
                ) {
                    // Convert the object to a Uint8Array
                    const bytes = new Uint8Array(
                        Object.values(fileContentUrl) as number[]
                    )

                    // Create a blob from the bytes
                    const blob = new Blob([bytes], { type: 'application/pdf' })
                    const urlObject = URL.createObjectURL(blob)

                    // Set the PDF URL object for display
                    setPdfURLObject(urlObject)

                    // Return as a File object
                    return new File([blob], pdfName, {
                        type: 'application/pdf',
                        lastModified: Date.now(),
                    })
                }

                // Also kept the URL property handling as a fallback
                // const objUrl = fileContentUrl as any;
                // if (objUrl.url && typeof objUrl.url === 'string' && objUrl.url.startsWith('http')) {
                //     return await fetchFileFromUrl(objUrl.url, pdfName);
                // }
            }

            console.log(`fetchPDFfile......5`)

            return null
        } catch (error) {
            console.error('Error fetching PDF file:', error)
            return null
        }
    }

    const fetchFileFromUrl = async (
        fileContentUrl: string,
        fileName: string
    ): Promise<File> => {
        const actualUrlToFetch = ensureDomainUrlHasSSL(fileContentUrl)
        const response = await fetch(actualUrlToFetch, {
            headers: { nonce: `${session?.nonce}` },
        })

        if (!response.ok) {
            toast.error(`${fileName} not found in system`)
            throw new Error(`Failed to fetch file: ${response.status}`)
        }

        let contentType = response.headers.get('Content-Type') || ''

        // Detect content type from URL if missing
        if (contentType === 'application/octet-stream' || contentType === '') {
            if (fileContentUrl.toLowerCase().endsWith('.pdf')) {
                contentType = 'application/pdf'
            }
        }

        const arrayBuffer = await response.arrayBuffer()
        const finalContentType = contentType || 'application/pdf'
        const blob = new Blob([arrayBuffer], { type: finalContentType })
        const urlObject = URL.createObjectURL(blob)

        setPdfURLObject(urlObject)

        return new File([blob], fileName, {
            type: finalContentType,
            lastModified: Date.now(),
        })
    }

    const shouldLoadSignatures = (): boolean => {
        if (!selectedFileInfo?.aquaTree?.revisions) return false

        const revisionHashes = Object.keys(selectedFileInfo.aquaTree.revisions)
        return revisionHashes.length >= 5 // Document has signatures
    }

    // const renderContent = () => {
    //     if (pdfLoadingFile) {
    //         return (
    //             <div className="flex flex-col items-center space-y-4">
    //                 <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    //                 <h2 className="text-2xl font-bold text-gray-700">
    //                     Loading PDF
    //                 </h2>
    //             </div>
    //         );
    //     }

    //     if (signaturesLoading) {
    //         return (
    //             <div className="flex flex-col items-center space-y-4">
    //                 <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    //                 <h3 className="text-xl font-bold text-gray-700">
    //                     Loading signatures...
    //                 </h3>
    //             </div>
    //         );
    //     }

    //     const isUserSignatureIncluded = signatures.some((sig) => sig.walletAddress === session?.address);
    //     // return <p className="whitespace-pre-wrap break-all">{JSON.stringify(signatures, null, 4)}</p>
    //     if (isUserSignatureIncluded) {
    //         return (
    //             <div className="grid grid-cols-4">
    //                 <div className="col-span-12 md:col-span-3">
    //                     <PDFDisplayWithJustSimpleOverlay
    //                         pdfUrl={pdfURLObject!}
    //                         annotationsInDocument={signatures}
    //                         signatures={signatures}
    //                     />
    //                 </div>
    //                 <div className="col-span-12 md:col-span-1 m-5">
    //                     <div className="flex flex-col space-y-2">
    //                         <p className="font-bold">Signatures in document.</p>
    //                         {signatures.map((signature: SignatureData, index: number) => (
    //                             <SignatureItem signature={signature} key={index} />
    //                         ))}
    //                     </div>
    //                 </div>
    //             </div>
    //         );
    //     }

    //     return (
    //         <PdfSigner
    //             documentSignatures={signatures}
    //             fileData={pdfFile}
    //             setActiveStep={setActiveStep}
    //         />
    //     );
    // };

    // Error boundary for the component
    if (!selectedFileInfo?.aquaTree?.revisions) {
        return (
            <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                <p className="font-semibold">Error: Document data not found</p>
            </div>
        )
    }

    const firstRevision =
        selectedFileInfo.aquaTree.revisions[
            Object.keys(selectedFileInfo.aquaTree.revisions)[0]
        ]
    if (!firstRevision?.forms_signers) {
        return (
            <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                <p className="font-semibold">Error: Signers not found</p>
            </div>
        )
    }

    // Loading states
    if (pdfLoadingFile) {
        return (
            <div className="flex flex-col items-center space-y-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <h2 className="text-2xl font-bold text-gray-700">
                    Loading PDF
                </h2>
            </div>
        )
    }

    if (signaturesLoading) {
        return (
            <div className="flex flex-col items-center space-y-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <h3 className="text-xl font-bold text-gray-700">
                    Loading signatures...
                </h3>
            </div>
        )
    }

    // Check if user has already signed
    const isUserSignatureIncluded = signatures.some(
        sig => sig.walletAddress === session?.address
    )

    if (isUserSignatureIncluded) {
        return (
            <div className="grid grid-cols-4">
                <div className="col-span-12 md:col-span-3">
                    <PDFDisplayWithJustSimpleOverlay
                        pdfUrl={pdfURLObject!}
                        annotationsInDocument={signatures}
                        signatures={signatures}
                    />
                </div>
                <div className="col-span-12 md:col-span-1 m-5">
                    <div className="flex flex-col space-y-2">
                        <p className="font-bold">Signatures in document.</p>
                        {signatures.map(
                            (signature: SignatureData, index: number) => (
                                <SignatureItem
                                    signature={signature}
                                    key={index}
                                />
                            )
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Default case - show signing interface
    return (
        <PdfSigner
            documentSignatures={signatures}
            fileData={pdfFile}
            setActiveStep={setActiveStep}
        />
    )
}
