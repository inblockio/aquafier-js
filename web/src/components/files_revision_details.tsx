import { RevisionDetailsSummaryData } from '@/models/AquaTreeDetails'
import appStore from '@/store'
import { AquaTree, FileObject, getGenesisHash, isAquaTree, Revision } from 'aqua-js-sdk'
import { useStore } from 'zustand'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, FileSignature, Eye, Link2, Clock, Hash, Network, Copy, ChevronRight } from 'lucide-react'
import { ERROR_TEXT, ERROR_UKNOWN, WITNESS_NETWORK_MAP } from '@/utils/constants'
import { displayTime, fetchLinkedFileName, formatCryptoAddress, getAquaTreeFileObject, getFileNameWithDeepLinking, isDeepLinkRevision } from '@/utils/functions'
import { ApiFileInfo } from '@/models/FileInfo'
import { toaster } from '@/components/ui/use-toast'
import SignatureWalletAddressCard from '@/pages/claims_workflow/SignatureWalletAddressCard'

export const RevisionDetailsSummary = ({ fileInfo, isWorkFlow }: RevisionDetailsSummaryData) => {
      const { files, setSelectedFileInfo } = useStore(appStore)
      const revisionHashes = Object.keys(fileInfo!.aquaTree!.revisions)

      const revisionsWithSignatures: Array<Revision> = []
      const revisionsWithWitness: Array<Revision> = []
      const revisionHashesWithLinks: Array<string> = []

      for (let i = 0; i < revisionHashes.length; i++) {
            const currentRevision: string = revisionHashes[i]
            const revision: Revision = fileInfo.aquaTree!.revisions[currentRevision]

            if (revision.revision_type == 'signature') {
                  revisionsWithSignatures.push(revision)
            }

            if (revision.revision_type == 'witness') {
                  revisionsWithWitness.push(revision)
            }

            if (revision.revision_type == 'link') {
                  revisionHashesWithLinks.push(currentRevision)
            }
      }

      const copyToClipboard = (text: string) => {
            navigator.clipboard.writeText(text)
      }

      return (
            <div className="max-w-4xl mx-auto space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                        <div>
                              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Revision Details</h2>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total revisions: {revisionHashes.length}</p>
                        </div>
                        {/* <Badge variant="outline" className="px-3 py-1">
                    {revisionHashes.length} Total
                </Badge> */}
                  </div>

                  {/* Signatures Section */}
                  {revisionsWithSignatures.length === 0 ? (
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500 rounded-lg">
                                          <FileSignature className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Signatures</h3>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">{revisionsWithSignatures.length} digital signatures found</p>
                                    </div>
                              </div>
                        </div>
                  ) : (
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                              <CardContent className="p-3">
                                    <div className="flex items-center gap-3 mb-4">
                                          <div className="p-2 bg-blue-500 rounded-lg">
                                                <FileSignature className="h-5 w-5 text-white" />
                                          </div>
                                          <div className="flex-1">
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Signatures</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{revisionsWithSignatures.length} digital signatures found</p>
                                          </div>
                                    </div>

                                    <div className="space-y-4">
                                          {/* {revisionsWithSignatures.map((revision, index) => (
                                <div
                                    key={`signature_${index}`}
                                    className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                                >
                                    <div className="flex items-start gap-4">
                                        <Badge
                                            variant="secondary"
                                            className="mt-1"
                                        >
                                            {index + 1}
                                        </Badge>

                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Hash className="h-4 w-4 text-gray-500" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Signature Hash:
                                                </span>
                                                <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                                                    {formatCryptoAddress(
                                                        revision.signature,
                                                        4,
                                                        6
                                                    )}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            revision.signature ??
                                                                ''
                                                        )
                                                    }
                                                    className="p-1 h-auto"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-gray-500" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Wallet:
                                                </span>
                                                <WalletEnsView
                                                    walletAddress={
                                                        revision.signature_wallet_address!
                                                    }
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-gray-500" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Timestamp:
                                                </span>
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    {displayTime(
                                                        revision.local_timestamp
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))} */}
                                          {revisionsWithSignatures.map((revision, index) => (
                                                <SignatureWalletAddressCard
                                                      key={`signature_${index}`}
                                                      signatureHash={revision.signature}
                                                      timestamp={displayTime(revision.local_timestamp)}
                                                      walletAddress={revision.signature_wallet_address!!}
                                                      index={index + 1}
                                                />
                                          ))}
                                    </div>
                              </CardContent>
                        </Card>
                  )}

                  {/* Witnesses Section */}
                  {revisionsWithWitness.length === 0 ? (
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500 rounded-lg">
                                          <Eye className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Witnesses</h3>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">{revisionsWithWitness.length} witnesses found</p>
                                    </div>
                              </div>
                        </div>
                  ) : (
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                              <CardContent className="p-3">
                                    <div className="flex items-center gap-3 mb-4">
                                          <div className="p-2 bg-green-500 rounded-lg">
                                                <Eye className="h-5 w-5 text-white" />
                                          </div>
                                          <div className="flex-1">
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Witnesses</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{revisionsWithWitness.length} witnesses found</p>
                                          </div>
                                    </div>

                                    <div className="space-y-1">
                                          {revisionsWithWitness.map((revision, index) => (
                                                <div key={`witness_${index}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                                      <div className="flex items-start gap-4">
                                                            <Badge variant="secondary" className="mt-1">
                                                                  {index + 1}
                                                            </Badge>

                                                            <div className="flex-1 space-y-3">
                                                                  <div className="flex items-center gap-2">
                                                                        <Network className="h-4 w-4 text-gray-500" />
                                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Network:</span>
                                                                        <Badge variant="outline" className="capitalize">
                                                                              {formatCryptoAddress(revision.witness_network ?? '', 4, 6)}
                                                                        </Badge>
                                                                  </div>

                                                                  <div className="flex items-center gap-2">
                                                                        <Clock className="h-4 w-4 text-gray-500" />
                                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp:</span>
                                                                        <span className="text-sm text-gray-600 dark:text-gray-400">{displayTime(revision.witness_timestamp?.toString() ?? '')}</span>
                                                                  </div>

                                                                  <div className="flex items-center gap-2">
                                                                        <Hash className="h-4 w-4 text-gray-500" />
                                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction:</span>
                                                                        <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                                                                              {formatCryptoAddress(
                                                                                    revision.witness_transaction_hash?.startsWith('0x')
                                                                                          ? (revision.witness_transaction_hash ?? '')
                                                                                          : `0x${revision.witness_transaction_hash ?? ''}`,
                                                                                    4,
                                                                                    6
                                                                              )}
                                                                        </code>
                                                                        <Button
                                                                              variant="ghost"
                                                                              size="sm"
                                                                              onClick={() => copyToClipboard(`0x${revision.witness_transaction_hash ?? ''}`)}
                                                                              className="p-1 h-auto"
                                                                        >
                                                                              <Copy className="h-3 w-3" />
                                                                        </Button>
                                                                        <a
                                                                              href={`${WITNESS_NETWORK_MAP[revision.witness_network ?? '']}/${revision.witness_transaction_hash}`}
                                                                              target="_blank"
                                                                              rel="noopener noreferrer"
                                                                              className="inline-flex items-center justify-center text-blue-500 hover:text-blue-600 transition-colors"
                                                                        >
                                                                              <ExternalLink className="h-3 w-3" />
                                                                        </a>
                                                                  </div>
                                                            </div>
                                                      </div>
                                                </div>
                                          ))}
                                    </div>
                              </CardContent>
                        </Card>
                  )}

                  {/* Links Section */}
                  {revisionHashesWithLinks.length === 0 ? (
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500 rounded-lg">
                                          <Link2 className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Links</h3>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">{revisionHashesWithLinks.length} file links found</p>
                                    </div>
                              </div>
                        </div>
                  ) : (
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                              <CardContent className="p-1">
                                    <div className="flex items-center gap-3 mb-4">
                                          <div className="p-2 bg-purple-500 rounded-lg">
                                                <Link2 className="h-5 w-5 text-white" />
                                          </div>
                                          <div className="flex-1">
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Links</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{revisionHashesWithLinks.length} file links found</p>
                                          </div>
                                    </div>

                                    <div className="space-y-4">
                                          {revisionHashesWithLinks.map((revisionHash, index) => {
                                                const revision = fileInfo!.aquaTree?.revisions[revisionHash]
                                                return (
                                                      <div key={`link_${index}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                                            <div className="flex items-start gap-4">
                                                                  <Badge variant="secondary" className="mt-1">
                                                                        {index + 1}
                                                                  </Badge>

                                                                  <div className="flex-1 space-y-3">
                                                                        <div className="flex items-center gap-2">
                                                                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Link Type:</span>
                                                                              {revisionDataHeader(fileInfo!.aquaTree!, revisionHash, fileInfo!.fileObject)}
                                                                        </div>

                                                                        <div className="flex items-center gap-2">
                                                                              {viewLinkedFile(fileInfo!, revisionHash, revision!, files, setSelectedFileInfo, isWorkFlow)}
                                                                        </div>
                                                                  </div>
                                                            </div>
                                                      </div>
                                                )
                                          })}
                                    </div>
                              </CardContent>
                        </Card>
                  )}
            </div>
      )
}

export const revisionDataHeader = (aquaTree: AquaTree, revisionHash: string, fileObject: FileObject[]): React.JSX.Element => {
      const revision = aquaTree.revisions[revisionHash]

      if (revision.previous_verification_hash.length == 0) {
            return (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Genesis Revision
                  </Badge>
            )
      }

      if (revision.revision_type == 'link') {
            const isDeepLink = isDeepLinkRevision(aquaTree, revisionHash)
            if (isDeepLink == null) {
                  return <Badge variant="destructive">{ERROR_TEXT}</Badge>
            }
            if (isDeepLink) {
                  // before returning deep link we traverse the current  aqua tree
                  const aquaTreeFiles = fileObject.filter(file => isAquaTree(file.fileContent))
                  console.log(`👁️‍🗨️ aquaTreeFiles ${aquaTreeFiles.length} --  `)
                  if (aquaTreeFiles.length > 0) {
                        const aquaTreePick = aquaTreeFiles.find(e => {
                              const tree: AquaTree = e.fileContent as AquaTree
                              const allHashes = Object.keys(tree.revisions)

                              console.log(`👁️‍🗨️ aquaTreeFiles ${allHashes.toString()} == ${revisionHash} `)
                              return allHashes.includes(revision.link_verification_hashes![0]!)
                        })

                        console.log(`👁️‍🗨️ aquaTreePick ${JSON.stringify(aquaTreePick, null, 4)} `)
                        if (aquaTreePick) {
                              const tree: AquaTree = aquaTreePick.fileContent as AquaTree
                              const genesisHash = getGenesisHash(tree)

                              console.log(`👁️‍🗨️  genesisHash ${genesisHash}`)
                              if (genesisHash) {
                                    const fileName = tree.file_index[genesisHash]
                                    console.log(`👁️‍🗨️ fileName ${fileName}`)

                                    if (fileName) {
                                          return (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                      Linked to {fileName}
                                                </Badge>
                                          )
                                    }
                              }
                        }
                  }

                  return (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              Deep Link previous {revision.previous_verification_hash} revisionHash {revisionHash}
                        </Badge>
                  )
            } else {
                  return (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Linked to {fetchLinkedFileName(aquaTree, revision)}
                        </Badge>
                  )
            }
      }

      return (
            <Badge variant="outline" className="capitalize">
                  {revision.revision_type}
            </Badge>
      )
}

export const viewLinkedFile = (
      selectedApiFileInfo: ApiFileInfo,
      revisionHash: string,
      revision: Revision,
      apiFileInfo: ApiFileInfo[],
      updateSelectedFile: (fileInfo: ApiFileInfo) => void,
      isWorkflow: boolean
): React.JSX.Element => {
      if (revision.revision_type == 'link') {
            if (isDeepLinkRevision(selectedApiFileInfo.aquaTree!, revisionHash)) {
                  return <></>
            }

            return (
                  <Button
                        data-testid="view-linked-file"
                        onClick={() => {
                              let linkedFileName = fetchLinkedFileName(selectedApiFileInfo.aquaTree!, revision)
                              let allFileObjects = [...selectedApiFileInfo.fileObject]
                              apiFileInfo.forEach(e => {
                                    allFileObjects = [...allFileObjects, ...e.fileObject]
                              })
                              if (isWorkflow || linkedFileName == ERROR_TEXT) {
                                    linkedFileName = getFileNameWithDeepLinking(selectedApiFileInfo.aquaTree!, revisionHash, allFileObjects)
                              }

                              let fileInfoFound: ApiFileInfo | undefined = undefined
                              if (linkedFileName != ERROR_TEXT && linkedFileName != ERROR_UKNOWN) {
                                    for (const fileInfo of apiFileInfo) {
                                          const fileObject = getAquaTreeFileObject(fileInfo)
                                          if (fileObject) {
                                                if (linkedFileName == fileObject.fileName) {
                                                      fileInfoFound = fileInfo
                                                      break
                                                }
                                          }
                                    }
                                    if (fileInfoFound) {
                                          updateSelectedFile({
                                                aquaTree: fileInfoFound.aquaTree,
                                                fileObject: [...fileInfoFound.fileObject, ...allFileObjects],
                                                linkedFileObjects: [],
                                                mode: '',
                                                owner: '',
                                          })
                                    } else {
                                          for (const fileObject of allFileObjects) {
                                                if (linkedFileName == fileObject.fileName) {
                                                      let aquaTree: AquaTree | undefined = undefined
                                                      if (linkedFileName.endsWith('.aqua.json')) {
                                                            aquaTree = fileObject.fileContent as AquaTree
                                                      } else {
                                                            const fileObjCtItem = allFileObjects.find(e => e.fileName == `${linkedFileName}.aqua.json`)
                                                            if (fileObjCtItem) {
                                                                  aquaTree = fileObjCtItem.fileContent as AquaTree
                                                            }
                                                      }

                                                      if (aquaTree == undefined) {
                                                            console.log(`show  ${linkedFileName}  filw object ${JSON.stringify(fileObject, null, 4)}`)
                                                            toaster.create({
                                                                  title: 'View not available',
                                                                  type: 'info',
                                                                  description: 'View not available',
                                                            })
                                                      } else {
                                                            updateSelectedFile({
                                                                  aquaTree: aquaTree,
                                                                  fileObject: allFileObjects,
                                                                  linkedFileObjects: [],
                                                                  mode: '',
                                                                  owner: '',
                                                            })
                                                      }
                                                      break
                                                }
                                          }
                                    }
                              } else {
                                    toaster.create({
                                          title: 'Link file not found , possibly a deep link ?',
                                          type: 'info',
                                          description: 'View not available',
                                    })
                              }
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                  >
                        <span>View File</span>
                        <ChevronRight className="h-3 w-3" />
                  </Button>
            )
      } else {
            return <></>
      }
}

// import { RevisionDetailsSummaryData } from "@/models/AquaTreeDetails";
// import appStore from "@/store";
// import { AquaTree, FileObject, getGenesisHash, isAquaTree, Revision } from "aqua-js-sdk";
// import { useStore } from "zustand";
// // import { Card, CardContent } from "@/components/ui/card";
// // import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { ExternalLink } from "lucide-react";
// import { ERROR_TEXT, ERROR_UKNOWN, WITNESS_NETWORK_MAP } from "@/utils/constants";
// import { displayTime, fetchLinkedFileName, formatCryptoAddress, getAquaTreeFileObject, getFileNameWithDeepLinking, isDeepLinkRevision } from "@/utils/functions";
// import { ItemDetail } from "./ItemDetails";
// import { Label } from "@/components/ui/label";
// import { ApiFileInfo } from "@/models/FileInfo";
// import { toaster } from "@/components/ui/use-toast";
// import { WalletEnsView } from "@/components/common/wallet_ens";

// export const RevisionDetailsSummary = ({ fileInfo, isWorkFlow }: RevisionDetailsSummaryData) => {
//     const { files, setSelectedFileInfo } = useStore(appStore);
//     const revisionHashes = Object.keys(fileInfo!.aquaTree!.revisions);

//     const revisionsWithSignatures: Array<Revision> = [];
//     const revisionsWithWitness: Array<Revision> = [];
//     const revisionHashesWithLinks: Array<string> = [];

//     for (let i = 0; i < revisionHashes.length; i++) {
//         const currentRevision: string = revisionHashes[i];
//         const revision: Revision = fileInfo.aquaTree!.revisions[currentRevision];

//         if (revision.revision_type == "signature") {
//             revisionsWithSignatures.push(revision);
//         }

//         if (revision.revision_type == "witness") {
//             revisionsWithWitness.push(revision);
//         }

//         if (revision.revision_type == "link") {
//             revisionHashesWithLinks.push(currentRevision);
//         }
//     }

//     return (
//         <div className="flex flex-col items-start w-full space-y-6">
//             <p className="text-sm text-gray-700 dark:text-gray-300">
//                 Revisions count: {revisionHashes.length}
//             </p>

//             {/* Signatures Section */}
//             <Card className="w-full bg-gray-100 dark:bg-gray-900">
//                 <CardContent className="p-4 md:p-6">
//                     <h3 className="text-lg font-semibold mb-4">
//                         Signatures ({revisionsWithSignatures.length})
//                     </h3>

//                     <div className="space-y-4">
//                         {revisionsWithSignatures.map((revision, index) => (
//                             <div
//                                 key={`hash_${index}`}
//                                 className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
//                             >
//                                 <Button variant="outline" size="sm" className="min-w-[32px] h-8">
//                                     {index + 1}
//                                 </Button>

//                                 <div className="flex-1 space-y-2">
//                                     <ItemDetail
//                                         label="Signature Hash:"
//                                         displayValue={formatCryptoAddress(revision.signature, 4, 6)}
//                                         value={revision.signature ?? ""}
//                                         showCopyIcon={true}
//                                     />
//                                     <WalletEnsView walletAddress={revision.signature_wallet_address!} />
//                                     <ItemDetail
//                                         label="Timestamp (UTC):"
//                                         displayValue={displayTime(revision.local_timestamp)}
//                                         value={revision.local_timestamp ?? ""}
//                                         showCopyIcon={false}
//                                     />
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </CardContent>
//             </Card>

//             {/* Witnesses Section */}
//             <Card className="w-full bg-gray-100 dark:bg-gray-900">
//                 <CardContent className="p-4 md:p-6">
//                     <h3 className="text-lg font-semibold mb-4">
//                         Witnesses ({revisionsWithWitness.length})
//                     </h3>

//                     <div className="space-y-4">
//                         {revisionsWithWitness.map((revision, index) => (
//                             <div
//                                 key={`witness_${index}`}
//                                 className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
//                             >
//                                 <Button variant="outline" size="sm" className="min-w-[32px] h-8">
//                                     {index + 1}
//                                 </Button>

//                                 <div className="flex-1 space-y-3">
//                                     <ItemDetail
//                                         label="Network:"
//                                         displayValue={formatCryptoAddress(revision.witness_network ?? "", 4, 6)}
//                                         value={revision.witness_network ?? " "}
//                                         showCopyIcon={false}
//                                     />

//                                     <ItemDetail
//                                         label="Timestamp (UTC):"
//                                         displayValue={displayTime(revision.witness_timestamp?.toString() ?? "")}
//                                         value={revision.witness_timestamp?.toString() ?? ""}
//                                         showCopyIcon={false}
//                                     />

//                                     <div className="flex items-center gap-2">
//                                         <ItemDetail
//                                             label="Transaction Hash:"
//                                             displayValue={formatCryptoAddress(
//                                                 revision.witness_transaction_hash?.startsWith('0x')
//                                                     ? revision.witness_transaction_hash ?? ""
//                                                     : `0x${revision.witness_transaction_hash ?? ""}`,
//                                                 4, 6
//                                             )}
//                                             value={`0x${revision.witness_transaction_hash ?? ""}`}
//                                             showCopyIcon={true}
//                                         />
//                                         <a
//                                             href={`${WITNESS_NETWORK_MAP[revision.witness_network ?? ""]}/${revision.witness_transaction_hash}`}
//                                             target="_blank"
//                                             rel="noopener noreferrer"
//                                             className="inline-flex items-center justify-center text-blue-500 hover:text-blue-600 transition-colors"
//                                         >
//                                             <ExternalLink size={16} />
//                                         </a>
//                                     </div>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </CardContent>
//             </Card>

//             {/* Links Section */}
//             <Card className="w-full bg-gray-100 dark:bg-gray-900">
//                 <CardContent className="p-4 md:p-6">
//                     <h3 className="text-lg font-semibold mb-4">
//                         Links ({revisionHashesWithLinks.length})
//                     </h3>

//                     <div className="space-y-4">
//                         {revisionHashesWithLinks.map((revisionHash, index) => {
//                             const revision = fileInfo!.aquaTree?.revisions[revisionHash];
//                             return (
//                                 <div
//                                     key={`link_${index}`}
//                                     className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 w-full"
//                                 >
//                                     <Button variant="outline" size="sm" className="min-w-[32px] h-8">
//                                         {index + 1}
//                                     </Button>

//                                     <div className="flex-1 space-y-3">
//                                         {revisionDataHeader(fileInfo!.aquaTree!, revisionHash, fileInfo!.fileObject)}
//                                         <div className="h-2" />
//                                         {viewLinkedFile(fileInfo!, revisionHash, revision!!, files, setSelectedFileInfo, isWorkFlow)}
//                                     </div>
//                                 </div>
//                             );
//                         })}
//                     </div>
//                 </CardContent>
//             </Card>
//         </div>
//     );
// };

// export const revisionDataHeader = (aquaTree: AquaTree, revisionHash: string, fileObject: FileObject[]): React.JSX.Element => {

//     const revision = aquaTree.revisions[revisionHash]

//     if (revision.previous_verification_hash.length == 0) {

//         <Label >
//             Genesis Revision
//         </Label>
//     }
//     if (revision.revision_type == "link") {
//         let isDeepLink = isDeepLinkRevision(aquaTree, revisionHash)
//         if (isDeepLink == null) {
//             return <Label>{ERROR_TEXT}</Label>
//         }
//         if (isDeepLink) {
//             // before returning deep link we traverse the current  aqua tree
//             const aquaTreeFiles = fileObject.filter(file => isAquaTree(file.fileContent));
//             console.log(`👁️‍🗨️ aquaTreeFiles ${aquaTreeFiles.length} --  `)
//             if (aquaTreeFiles.length > 0) {
//                 let aquaTreePick = aquaTreeFiles.find((e) => {
//                     let tree: AquaTree = e.fileContent as AquaTree
//                     let allHashes = Object.keys(tree.revisions);

//                     console.log(`👁️‍🗨️ aquaTreeFiles ${allHashes.toString()} == ${revisionHash} `)
//                     return allHashes.includes(revision.link_verification_hashes![0]!)
//                 })

//                 console.log(`👁️‍🗨️ aquaTreePick ${JSON.stringify(aquaTreePick, null, 4)} `)
//                 if (aquaTreePick) {
//                     let tree: AquaTree = aquaTreePick.fileContent as AquaTree
//                     let genesisHash = getGenesisHash(tree)

//                     console.log(`👁️‍🗨️  genesisHash ${genesisHash}`)
//                     if (genesisHash) {

//                         let fileName = tree.file_index[genesisHash]
//                         console.log(`👁️‍🗨️ fileName ${fileName}`)

//                         if (fileName) {
//                             return <Label >
//                                 Linked to {fileName}
//                             </Label>
//                         }
//                     }

//                 }
//             }

//             return <Label>
//                 Deep Link previous {revision.previous_verification_hash} revisionHash {revisionHash}
//             </Label>
//         } else {
//             // fontSize={"md"}
//             return <Label >
//                 linked to {fetchLinkedFileName(aquaTree, revision)}
//             </Label>
//         }
//     }

//     return <Label>
//         {revision.revision_type}
//     </Label >
// }

// export const viewLinkedFile = (selectedApiFileInfo: ApiFileInfo, revisionHash: string, revision: Revision, apiFileInfo: ApiFileInfo[], updateSelectedFile: (fileInfo: ApiFileInfo) => void, isWorkflow: boolean): React.JSX.Element => {

//     if (revision.revision_type == "link") {

//         if (isDeepLinkRevision(selectedApiFileInfo.aquaTree!!, revisionHash)) {
//             return <></>
//         }

//         return <Button  data-testid="view-linked-file" onClick={
//             () => {
//                 let linkedFileName = fetchLinkedFileName(selectedApiFileInfo.aquaTree!!, revision);
//                 let allFileObjects = [...selectedApiFileInfo.fileObject]
//                 apiFileInfo.forEach((e) => {
//                     allFileObjects = [...allFileObjects, ...e.fileObject];
//                 })
//                 if (isWorkflow || linkedFileName == ERROR_TEXT) {

//                     linkedFileName = getFileNameWithDeepLinking(selectedApiFileInfo.aquaTree!!, revisionHash, allFileObjects)

//                 }

//                 let fileInfoFound: ApiFileInfo | undefined = undefined
//                 if (linkedFileName != ERROR_TEXT && linkedFileName != ERROR_UKNOWN) {
//                     for (let fileInfo of apiFileInfo) {
//                         let fileObject = getAquaTreeFileObject(fileInfo);
//                         if (fileObject) {
//                             if (linkedFileName == fileObject.fileName) {

//                                 fileInfoFound = fileInfo
//                                 break
//                             }
//                         }
//                     }
//                     if (fileInfoFound) {
//                         updateSelectedFile({
//                             aquaTree: fileInfoFound.aquaTree,
//                             fileObject:[...fileInfoFound.fileObject, ...allFileObjects],
//                             linkedFileObjects:[],
//                             mode:"",
//                             owner:""
//                         })
//                     } else {

//                         for (let fileObject of allFileObjects) {

//                             if (linkedFileName == fileObject.fileName) {
//                                 let aquaTree: AquaTree | undefined = undefined;
//                                 if (linkedFileName.endsWith(".aqua.json")) {
//                                     aquaTree = fileObject.fileContent as AquaTree
//                                 } else {
//                                     let fileObjCtItem = allFileObjects.find((e) => e.fileName == `${linkedFileName}.aqua.json`)
//                                     if (fileObjCtItem) {
//                                         aquaTree = fileObjCtItem.fileContent as AquaTree
//                                     }
//                                 }

//                                 if (aquaTree == undefined) {
//                                     console.log(`show  ${linkedFileName}  filw object ${JSON.stringify(fileObject, null, 4)}`)
//                                     toaster.create({
//                                         title: "View not available",
//                                         type: 'info',
//                                         description: "View not available"
//                                     })
//                                 } else {
//                                     updateSelectedFile({
//                                         aquaTree: aquaTree,
//                                         fileObject: allFileObjects,
//                                         linkedFileObjects: [],
//                                         mode: "",
//                                         owner: ""
//                                     })
//                                 }

//                                 break
//                             }

//                         }

//                     }
//                 } else {
//                     toaster.create({
//                         title: "Link file not found , possibly a deep link ?",
//                         type: 'info',
//                          description: "View not available"
//                     })
//                 }
//             }
//         }>View File </Button>

//     } else {
//         return <></>
//     }
// }
