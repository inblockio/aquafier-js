
import FilePreview from "@/components/FilePreview"
import { LogViewer } from "@/components/logs/LogViewer"
import { ICompleteChainView, VerificationHashAndResult } from "@/models/AquaTreeDetails"
import appStore from "@/store"
import { ensureDomainUrlHasSSL, getFileName, getFileHashFromUrl, isArrayBufferText, isWorkFlowData } from "@/utils/functions"
import Aquafier, { LogData, FileObject, getAquaTreeFileName, getAquaTreeFileObject } from "aqua-js-sdk"
import { ChevronUp, ChevronDown } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useStore } from "zustand"

import { Card, CardContent } from "@/components/shadcn/ui/card"
import { Button } from "@/components/shadcn/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/shadcn/ui/collapsible"
import { ApiFileData } from "@/types"
import { CustomAlert } from "@/components/shadcn/ui/alert-custom"
import { RevisionDetailsSummary } from "./files_revision_details"
import { RevisionDisplay } from "./files_revision_display"

export const CompleteChainView = ({ callBack, selectedFileInfo }: ICompleteChainView) => {
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [isSelectedFileAWorkFlow, setSelectedFileAWorkFlow] = useState(false)
  const { session, setApiFileData, apiFileData, systemFileInfo, user_profile } = useStore(appStore)
  const [deletedRevisions, setDeletedRevisions] = useState<string[]>([])
  const [verificationResults, setVerificationResults] = useState<VerificationHashAndResult[]>([])
  const [allLogs, setAllLogs] = useState<LogData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const isVerificationSuccessful = useCallback((results: VerificationHashAndResult[]) =>
    results.every(r => r.isSuccessful),
    [])

  const isVerificationComplete = useCallback((results: VerificationHashAndResult[]) =>
    selectedFileInfo?.aquaTree?.revisions ?
      results.length === Object.keys(selectedFileInfo.aquaTree.revisions).length : false,
    [selectedFileInfo])

  const displayBasedOnVerificationStatusText = (results: VerificationHashAndResult[]) => {
    if (!isVerificationComplete(results)) return "Verifying Aqua tree"
    return isVerificationSuccessful(results) ? "This aqua tree is valid" : "This aqua tree is invalid"
  }



  const displayColorBasedOnVerificationAlert = (results: VerificationHashAndResult[]) => {
    if (!isVerificationComplete(results)) return "info"
    return isVerificationSuccessful(results) ? "success" : "error"
  }

  const fetchFileData = async (url: string): Promise<string | ArrayBuffer | null> => {
    try {
      const response = await fetch(ensureDomainUrlHasSSL(url), {
        headers: { nonce: `${session?.nonce}` },
      })
      if (!response.ok) throw new Error("Failed to fetch file")
      const contentType = response.headers.get("Content-Type") || ""
      if (contentType.startsWith("text/") ||
        ["application/json", "application/xml", "application/javascript"].includes(contentType)) {
        return await response.text()
      }
      return await response.arrayBuffer()
    } catch (e) {
      console.error("Error fetching file:", e)
      return null
    }
  }

  const deleteRevision = useCallback((revisionHash: string) => {
    setDeletedRevisions(prev => [...prev, revisionHash])
  }, [])

  useEffect(() => {
    const verify = async () => {
      if (!selectedFileInfo?.aquaTree || !selectedFileInfo.fileObject || isProcessing) return
      setIsProcessing(true)
      try {
        const aquafier = new Aquafier()
        const fileName = getFileName(selectedFileInfo.aquaTree)
        const cacheMap = new Map(apiFileData?.map(item => [item.fileHash, item.fileData]))

        const fileObjectVerifier: FileObject[] = []
        const filePromises = selectedFileInfo.fileObject.map(async file => {
          if (typeof file.fileContent === 'string' && file.fileContent.startsWith('http')) {
            const hash = getFileHashFromUrl(file.fileContent)
            let data = hash ? cacheMap.get(hash) : null
            if (!data) data = await fetchFileData(file.fileContent)
            // if (data && hash) setApiFileData((prev: ApiFileData[]) => [...prev, { fileHash: hash, fileData: data }])
            if (data && hash) setApiFileData(
              [...apiFileData, { fileHash: hash, fileData: data }]
            )
            if (data instanceof ArrayBuffer) {
              file.fileContent = isArrayBufferText(data) ? new TextDecoder().decode(data) : new Uint8Array(data)
            } else if (typeof data === 'string') file.fileContent = data
          }
          fileObjectVerifier.push(file)
        })
        await Promise.all(filePromises)

        const revisionHashes = Object.keys(selectedFileInfo.aquaTree.revisions || {})
        const verificationResults = await Promise.all(revisionHashes.map(async hash => {
          const revision = selectedFileInfo.aquaTree!.revisions[hash]
          const result = await aquafier.verifyAquaTreeRevision(
            selectedFileInfo.aquaTree!,
            revision,
            hash,
            fileObjectVerifier,
            {
              mnemonic: "",
              nostr_sk: "",
              did_key: "",
              alchemy_key: user_profile?.alchemy_key ?? "",
              witness_eth_network: user_profile?.witness_network ?? "sepolia",
              witness_method: "metamask"
            }
          )
          return {
            hash,
            isSuccessful: result.isOk(),
            logs: result.isOk() ? result.data.logData : result.data
          }
        }))

        setVerificationResults(verificationResults)
        setAllLogs(verificationResults.flatMap(r => r.logs))

        callBack({
          fileName,
          colorLight: "",
          colorDark: "",
          isVerificationSuccessful: isVerificationSuccessful(verificationResults)
        })
      } catch (e) {
        console.error("Verification error:", e)
      } finally {
        setIsProcessing(false)
      }
    }

    if (selectedFileInfo) {
      setAllLogs([])
      verify()
      const names = systemFileInfo.map(e => getAquaTreeFileName(e.aquaTree!!))
      setSelectedFileAWorkFlow(isWorkFlowData(selectedFileInfo.aquaTree!!, names).isWorkFlow)
    }
  }, [selectedFileInfo, deletedRevisions.length])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
          <Card className="shadow-none border-none">
            <CardContent>
              <FilePreview fileInfo={getAquaTreeFileObject(selectedFileInfo!!)!!} />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardContent className="space-y-4">
             

              <CustomAlert
                type={displayColorBasedOnVerificationAlert(verificationResults)}
                title={displayBasedOnVerificationStatusText(verificationResults)}
                description={displayBasedOnVerificationStatusText(verificationResults)}
              />
              <RevisionDetailsSummary
                isWorkFlow={isSelectedFileAWorkFlow}
                isVerificationComplete={isVerificationComplete(verificationResults)}
                isVerificationSuccess={isVerificationSuccessful(verificationResults)}
                fileInfo={selectedFileInfo!!}
              />
              <Collapsible open={showMoreDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full" onClick={() => setShowMoreDetails(prev => !prev)}>
                    {showMoreDetails ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                    {showMoreDetails ? "Show Less Details" : "Show More Details"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {selectedFileInfo?.aquaTree && (
                    // <Timeline size="lg" variant="subtle">
                    <>

                      {Object.keys(selectedFileInfo.aquaTree.revisions)
                        .filter(hash => !deletedRevisions.includes(hash))
                        .map((revisionHash, index) => (
                          <RevisionDisplay
                            key={`revision_${index}`}
                            fileInfo={selectedFileInfo!!}
                            revision={selectedFileInfo.aquaTree!.revisions[revisionHash]!!}
                            revisionHash={revisionHash}
                            isVerificationComplete={isVerificationComplete(verificationResults)}
                            verificationResults={verificationResults}
                            isDeletable={index === Object.keys(selectedFileInfo.aquaTree!.revisions).length - 1}
                            deleteRevision={deleteRevision}
                            index={index}
                          />
                        ))}
                    </>
                    // </Timeline>
                  )}
                </CollapsibleContent>
              </Collapsible>
              {/* <LogViewer logs={allLogs as any} title="Verification Logs" /> */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
