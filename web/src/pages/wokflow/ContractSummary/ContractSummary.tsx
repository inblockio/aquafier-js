

import { useCallback, useEffect, useState } from 'react';
import appStore from '../../../store';
import { useStore } from "zustand"
import { ContractDocumentViewProps, SummaryDetailsDisplayData } from '../../../types/types';
import Aquafier, { AquaTree, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk/web';
import { isAquaTree, timeToHumanFriendly, getHighestFormIndex, getFileName, getFileHashFromUrl, fetchFileData, isArrayBufferText } from '../../../utils/functions';

import { ApiFileInfo } from '../../../models/FileInfo';
import { IDrawerStatus, VerificationHashAndResult } from '../../../models/AquaTreeDetails';
import ContractSummaryDetails from './ContractSummaryDetails';




export const ContractSummaryView: React.FC<ContractDocumentViewProps> = ({ setActiveStep }) => {

    const [isLoading, setIsLoading] = useState(true);
    const [signatureRevionHashesData, setSignatureRevionHashes] = useState<SummaryDetailsDisplayData[]>([])
    const [isWorkFlowComplete, setIsWorkFlowComplete] = useState<string[]>([])
    const [_creatorEthreiumSignatureRevisionData, setCreatorEthreiumSignatureRevisionData] = useState<Revision | undefined>(undefined)
    const [firstRevisionData, setFirstRevisionData] = useState<Revision | undefined>(undefined);
    const [fileNameData, setFileNameData] = useState<string>("");
    const [contractCreatorAddress, setContractCreatorAddress] = useState<string>("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [verificationResults, setVerificationResults] = useState<VerificationHashAndResult[]>([])


    // let firstRevisionHash = selectedFileInfo
    const { selectedFileInfo, apiFileData, setApiFileData, session } = useStore(appStore)

    const getSignatureRevionHashes = (hashesToLoopPar: Array<string>): Array<SummaryDetailsDisplayData> => {

        const signatureRevionHashes: Array<SummaryDetailsDisplayData> = []


        for (let i = 0; i < hashesToLoopPar.length; i += 3) {


            const batch = hashesToLoopPar.slice(i, i + 3);


            let signaturePositionCount = 0
            let hashSigPosition = batch[0] ?? ""
            let hashSigRev = batch[1] ?? ""
            let hashSigMetamak = batch[2] ?? ""
            let walletAddress = "";

            if (hashSigPosition.length > 0) {
                let allAquaTrees = selectedFileInfo?.fileObject.filter((e) => isAquaTree(e.fileContent))

                let hashSigPositionHashString = selectedFileInfo!.aquaTree!.revisions[hashSigPosition].link_verification_hashes![0];


                if (allAquaTrees) {
                    for (let anAquaTreeFileObject of allAquaTrees) {
                        let anAquaTree: AquaTree = anAquaTreeFileObject.fileContent as AquaTree
                        let allHashes = Object.keys(anAquaTree.revisions)
                        if (allHashes.includes(hashSigPositionHashString)) {

                            // let aquaTreeData = anAquaTree.fileContent as AquaTree
                            let revData = anAquaTree.revisions[hashSigPositionHashString]
                            signaturePositionCount = getHighestFormIndex(revData) + 1 // sinature count is 0 based

                            break
                        }
                    }


                }

            }

            let metaMaskRevision = selectedFileInfo!.aquaTree!.revisions[hashSigMetamak];
            if (metaMaskRevision) {
                walletAddress = metaMaskRevision.signature_wallet_address ?? ""
            }
            let data: SummaryDetailsDisplayData = {
                revisionHashWithSignaturePositionCount: signaturePositionCount,
                revisionHashWithSignaturePosition: hashSigPosition,
                revisionHashWithSinatureRevision: hashSigRev,
                revisionHashMetamask: hashSigMetamak,
                walletAddress: walletAddress
            }

            signatureRevionHashes.push(data)

        }


        return signatureRevionHashes
    }

    // Memoized display text function
    // const displayBasedOnWorkflowStatusText = (isComplete: boolean) => {
    //     return isComplete ? "This work flow  is complete. " : "This workflow  is incomplete";
    // }

    // const displayBasedOnVerificationStatusText = (verificationResults: any) => {
    //     if (!isVerificationComplete(verificationResults)) {
    //         return "Verifying Aqua tree";
    //     }
    //     return isVerificationSuccessful(verificationResults) ? "This work flow  is valid. " : "This workflow  is invalid. It cannot be trusted";
    // }

    // // Memoized alert color function
    // const displayColorBasedOnVerificationAlert = (verificationResults: any): "info" | "success" | "error" => {
    //     if (!isVerificationComplete(verificationResults)) {
    //         return "info";
    //     }
    //     return isVerificationSuccessful(verificationResults) ? 'success' : 'error';
    // }

    // Memoized verification completion check
    const isVerificationComplete = useCallback((_verificationResults: VerificationHashAndResult[]): boolean => {
        return selectedFileInfo?.aquaTree?.revisions ?
            _verificationResults.length === Object.keys(selectedFileInfo.aquaTree.revisions).length : false;
    }, [selectedFileInfo?.aquaTree?.revisions]);

    // Memoized verification status check to prevent recalculation
    const isVerificationSuccessful = useCallback((_verificationResults: VerificationHashAndResult[]): boolean => {
        for (const item of _verificationResults.values()) {
            if (!item.isSuccessful) {
                return false;
            }
        }
        return true;
    }, []);

    // Memoized color functions to prevent recalculation
    const displayColorBasedOnVerificationStatusLight = useCallback((_verificationResults: VerificationHashAndResult[]) => {
        if (!isVerificationComplete(_verificationResults)) {
            return "grey";
        }
        return isVerificationSuccessful(_verificationResults) ? 'green.100' : 'red.100';
    }, []);

    const displayColorBasedOnVerificationStatusDark = useCallback((_verificationResults: VerificationHashAndResult[]) => {
        if (!isVerificationComplete(_verificationResults)) {
            return "whitesmoke";
        }
        return isVerificationSuccessful(_verificationResults) ? 'green.900' : 'red.900';
    }, []);

    const verifyAquaTreeRevisions = async (fileInfo: ApiFileInfo) => {
        if (!fileInfo?.aquaTree || !fileInfo?.fileObject || isProcessing) return;

        setIsProcessing(true);

        try {
            const aquafier = new Aquafier();
            const _drawerStatus: IDrawerStatus = {
                colorLight: "",
                colorDark: "",
                fileName: "",
                isVerificationSuccessful: false
            };

            // Set file name
            const fileName = getFileName(fileInfo.aquaTree);
            _drawerStatus.fileName = fileName;

            // Get revision hashes
            const revisionHashes = Object.keys(fileInfo.aquaTree.revisions || {});

            // Create a map for quick cache lookup
            const cacheMap = new Map();
            // if (Array.isArray(apiFileData)) {
            //     apiFileData.forEach(item => {
            //         if (item && item.fileHash) {
            //             cacheMap.set(item.fileHash, item.fileData);
            //         }
            //     });
            // }

            // Process files in parallel
            // const filePromises = [];
            // const fileObjectVerifier: FileObject[] = [];

            // for (const file of fileInfo.fileObject) {
            //     if (typeof file.fileContent === 'string' &&
            //         (file.fileContent.startsWith("http://") || file.fileContent.startsWith("https://"))) {

            //         const fileContentUrl = file.fileContent;
            //         const fileHash = getFileHashFromUrl(fileContentUrl);

            //         // Check cache first
            //         let fileData = fileHash.length > 0 ? cacheMap.get(fileHash) : null;

            //         if (!fileData) {
            //             // If not in cache, create a promise to fetch it
            //             const fetchPromise = fetchFileData(fileContentUrl, session!.nonce).then(data => {

            //                 if (data && fileHash.length > 0) {
            //                     // Update cache
            //                     // setApiFileData((prev: any) => {
            //                     //     const prevArray = Array.isArray(prev) ? prev : [];
            //                     //     return [...prevArray, { fileHash, fileData: data }];
            //                     // });
            //                     let dd = Array.isArray(apiFileData) ? [...apiFileData] : [];
            //                     dd.push({ fileHash, fileData })
            //                     setApiFileData(dd)
            //                     return { file, data };
            //                 }
            //                 return null;
            //             });
            //             filePromises.push(fetchPromise);
            //         } else {
            //             // If in cache, process immediately
            //             const fileItem = { ...file };
            //             if (fileData instanceof ArrayBuffer) {
            //                 if (isArrayBufferText(fileData)) {
            //                     fileItem.fileContent = new TextDecoder().decode(fileData);
            //                 } else {
            //                     fileItem.fileContent = new Uint8Array(fileData);
            //                 }
            //             } else if (typeof fileData === 'string') {
            //                 fileItem.fileContent = fileData;
            //             }
            //             // fileObjectVerifier.push(fileItem);
            //             return fileItem
            //         }
            //     } else {
            //         // Non-URL files can be added directly
            //         // fileObjectVerifier.push(file);
            //         return file
            //     }
            // }

            // // Wait for all file fetches to complete
            // if (filePromises.length > 0) {
            //     const fetchedFiles = await Promise.all(filePromises);

            //     // Process fetched files
            //     for (const result of fetchedFiles) {
            //         if (result) {
            //             const { file, data } = result;
            //             const fileItem = { ...file };

            //             if (data instanceof ArrayBuffer) {
            //                 if (isArrayBufferText(data)) {
            //                     fileItem.fileContent = new TextDecoder().decode(data);
            //                 } else {
            //                     fileItem.fileContent = new Uint8Array(data);
            //                 }
            //             } else if (typeof data === 'string') {
            //                 fileItem.fileContent = data;
            //             }

            //             fileObjectVerifier.push(fileItem);
            //             // return fileItem
            //         }
            //     }
            // }

            // UPDATE: Removed fileObjectVerifier to track the fileobjects because pushing in promises is not ideal
            // const fileObjectVerifier: FileObject[] = []
            const filePromises = fileInfo.fileObject.map(async file => {
                if (typeof file.fileContent === 'string' && file.fileContent.startsWith('http')) {
                    const hash = getFileHashFromUrl(file.fileContent)

                    // TODO: FIX ME - Here we check if the file is already in the cache
                    // let _data = hash ? cacheMap.get(hash) : null

                    let fetchedData = await fetchFileData(file.fileContent, session!.nonce)
                    if (fetchedData && hash) {
                        cacheMap.set(hash, fetchedData)
                        setApiFileData(
                            [...apiFileData, { fileHash: hash, fileData: fetchedData }]
                        )
                    }
                    if (fetchedData instanceof ArrayBuffer) {
                        file.fileContent = isArrayBufferText(fetchedData) ? new TextDecoder().decode(fetchedData) : new Uint8Array(fetchedData)
                    } else if (typeof fetchedData === 'string') {
                        file.fileContent = fetchedData
                    }
                    return file
                }
                return file
                // fileObjectVerifier.push(file)
            })

            // We wait for all the file promises to resolve and get the file objects to use
            const filesResult = await Promise.all(filePromises)

            // Process revisions in parallel where possible
            const verificationPromises = revisionHashes.map(async revisionHash => {
                const revision = fileInfo.aquaTree!.revisions[revisionHash];
                const result = await aquafier.verifyAquaTreeRevision(
                    fileInfo.aquaTree!,
                    revision,
                    revisionHash,
                    filesResult
                )
                return ({
                    hash: revisionHash,
                    isSuccessful: result.isOk()
                })
            });

            // Wait for all verifications to complete
            const allRevisionsVerificationsStatus = await Promise.all(verificationPromises);

            // Update state and callback
            setVerificationResults(allRevisionsVerificationsStatus);
            const _isVerificationSuccessful = isVerificationSuccessful(allRevisionsVerificationsStatus);
            _drawerStatus.isVerificationSuccessful = _isVerificationSuccessful;
            _drawerStatus.colorDark = displayColorBasedOnVerificationStatusDark(allRevisionsVerificationsStatus);
            _drawerStatus.colorLight = displayColorBasedOnVerificationStatusLight(allRevisionsVerificationsStatus);
            // callBack(_drawerStatus);
        } catch (error) {
            console.error("Error verifying AquaTree revisions:", error);
        } finally {
            setIsProcessing(false);
            setIsLoading(false);
        }
    }

    const intializeContractInformation = () => {

        if (selectedFileInfo) {


            const orderedTree = OrderRevisionInAquaTree(selectedFileInfo!.aquaTree!)

            const revisions = orderedTree.revisions
            const revisionHashes = Object.keys(revisions)

            const firstHash: string = revisionHashes[0];
            const firstRevision: Revision = selectedFileInfo!.aquaTree!.revisions[firstHash]
            setFirstRevisionData(firstRevision)

            const pdfHash = revisionHashes[2];
            const thirdRevision: Revision = selectedFileInfo!.aquaTree!.revisions[pdfHash]
            let hashOfLinkedDocument = thirdRevision.link_verification_hashes![0]!
            let fileName = selectedFileInfo!.aquaTree!.file_index[hashOfLinkedDocument]
            setFileNameData(fileName)
            const creatorSignatureHash = revisionHashes[3];
            const signatureRevision: Revision | undefined = selectedFileInfo!.aquaTree!.revisions[creatorSignatureHash]
            setCreatorEthreiumSignatureRevisionData(signatureRevision)
            if (signatureRevision.revision_type == "signature") {
                setContractCreatorAddress(signatureRevision.signature_wallet_address ?? "--eror--")
            }

            let fourthItmeHashOnwards: string[] = [];
            let signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

            let signers: string[] = firstRevision.forms_signers.split(",").map((e: string) => e.trim())

            if (revisionHashes.length > 4) {
                // remove the first 4 elements from the revision list 
                fourthItmeHashOnwards = revisionHashes.slice(4);
                signatureRevionHashes = getSignatureRevionHashes(fourthItmeHashOnwards)



                let signatureRevionHashesDataAddress = signatureRevionHashes.map((e) => e.walletAddress);
                let remainSigners = signers.filter((item) => !signatureRevionHashesDataAddress.includes(item))
                setIsWorkFlowComplete(remainSigners)

                setSignatureRevionHashes(signatureRevionHashes)
            } else {
                setIsWorkFlowComplete(signers)
            }

            verifyAquaTreeRevisions(selectedFileInfo)
        }
    }
    useEffect(() => {
        intializeContractInformation()
    }, [])


    useEffect(() => {
        intializeContractInformation()
    }, [JSON.stringify(selectedFileInfo), selectedFileInfo])




    // const isWorkflowComplete = () => {
    //     let signers: string[] = firstRevisionData?.forms_signers.split(",")
    //     let signatureRevionHashesDataAddress = signatureRevionHashesData.map((e) => e.walletAddress)
    //     let remainSigners = signers.filter((item) => !signatureRevionHashesDataAddress.includes(item))
    //     return remainSigners
    // }

    const getActualState = () => {
        let status = "pending"
        // if (isVerificationComplete(verificationResults)) {
        if (isWorkFlowComplete.length === 0) {
            if (isVerificationSuccessful(verificationResults)) {
                status = "successful"
            }
            else {
                status = "failed"
            }
        }

        return status
    }

    const displayData = () => {

        if (isLoading) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="flex flex-col items-center space-y-4">
                        {/* Loading Spinner */}
                        <div className="h-12 w-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>

                        {/* Loading Text */}
                        <h2 className="text-xl font-semibold text-gray-700">
                            Loading...
                        </h2>
                        <p className="text-gray-500">
                            Please wait while we prepare your content
                        </p>
                    </div>
                </div>
            )
        }




        return <div className='max-w-8xl mx-auto'>

            <ContractSummaryDetails data={{
                name: fileNameData,
                creationDate: timeToHumanFriendly(firstRevisionData?.local_timestamp, true),
                creatorAddress: contractCreatorAddress,
                documentUrl: "#",
                status: isWorkFlowComplete.length === 0 ? "completed" : "pending",
                pendingSignatures: 0,
                signers: [
                    ...firstRevisionData?.forms_signers.split(",").map((signer: string) => {
                        let item = signatureRevionHashesData.find((e) => e.walletAddress.toLowerCase().trim() == signer.toLowerCase().trim())

                        if (item) {
                            return ({
                                address: signer,
                                status: "signed"
                            })
                        } else {
                            // if isWorkFlowComplete is empty show green check mark
                            // this experiemntal,
                            if (isWorkFlowComplete.length === 0) {
                                return ({
                                    address: signer,
                                    status: "signed"
                                })
                            }
                            return ({
                                address: signer,
                                status: "pending"
                            })
                        }
                    })
                ],
                activities: [
                    {
                        type: "created",
                        address: contractCreatorAddress,
                        timestamp: timeToHumanFriendly(firstRevisionData?.local_timestamp, true),
                        details: <>Document <span className='font-bold'>{fileNameData}</span> was selected for signing</>,
                    },
                    ...signatureRevionHashesData.map((_signatureRevionHasheItem) => {
                        const singatureRevisionItem = selectedFileInfo!.aquaTree!.revisions[_signatureRevionHasheItem.revisionHashMetamask]
                        return ({
                            type: "signed" as any,
                            address: singatureRevisionItem && singatureRevisionItem.signature_wallet_address ? singatureRevisionItem.signature_wallet_address : "",
                            timestamp: singatureRevisionItem && singatureRevisionItem.local_timestamp ? timeToHumanFriendly(singatureRevisionItem.local_timestamp, true) : "time   error",
                            // details: "Document sample-local-pdf.pdf was selected for signing",
                        })
                    }),
                    ...(isWorkFlowComplete.length === 0 ? [
                        {
                            type: "completed" as const,
                            timestamp: "N/A"
                        }
                    ] : [])
                ],
                footerMsg: isWorkFlowComplete.length === 0 ? "" : `${isWorkFlowComplete.length} ${isWorkFlowComplete.length > 1 ? "signatures" : "Signature"} pending for workflow to be completed`
            }}
                goToSecondPage={() => {
                    setActiveStep(2) // Open the contract document
                }}
                enableNameResolution={true}
                isValidTree={getActualState() as "pending" | "successful" | "failed"}
            />
        </div>
    }

    return <>{displayData()}</>

}