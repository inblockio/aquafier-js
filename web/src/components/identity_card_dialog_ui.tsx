import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2, Save, CheckSquare } from "lucide-react"
import { useEffect, useState } from "react"
import { useStore } from "zustand"
import appStore from "@/store"
import { ApiFileInfo } from "@/models/FileInfo"
import {
  estimateFileSize,
  getAquaTreeFileObject,
  getGenesisHash,
  getRandomNumber,
  isWorkFlowData,
  timeToHumanFriendly,
  ensureDomainUrlHasSSL
} from "@/utils/functions"
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject } from "aqua-js-sdk"
import { toast } from "sonner"
import axios from "axios"
import { useAquaSystemNames } from "@/hooks/useAquaSystemNames"
import { RELOAD_KEYS, triggerWorkflowReload } from "@/utils/reloadDatabase"
import FilesList from "@/pages/files/files_list"
import { API_ENDPOINTS } from "@/utils/constants"

interface IdentityCardDialogUiProps {
  isOpen: boolean
  onClose: () => void
  walletAddress: string
}

const IdentityCardDialogUi: React.FC<IdentityCardDialogUiProps> = ({
  isOpen,
  onClose,
  walletAddress
}: IdentityCardDialogUiProps) => {
  const { session, backend_url, setOpenDialog, setSelectedFileInfo } = useStore(appStore)
  const { systemNames: systemAquaFileNames } = useAquaSystemNames()

  const [selectedWorkflows, setSelectedWorkflows] = useState<ApiFileInfo[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [workflowFiles, setWorkflowFiles] = useState<ApiFileInfo[]>([])
  const [loading, setLoading] = useState(true)

  // Define which workflows are allowed in identity cards (claims and related workflows)
  const allowedWorkflowsForIdentityCard = [
    // 'simple_claim',
    'domain_claim',
    'identity_claim',
    'phone_number_claim',
    'email_claim',
    'user_signature',
    // 'dns_claim',
    'dba_claim',
    // 'ens_claim',
  ]

  // Load workflows on mount
  useEffect(() => {
    if (isOpen && walletAddress) {
      loadWorkflows()
    }
  }, [isOpen, walletAddress, systemAquaFileNames])

  const loadWorkflows = async () => {
    setLoading(true)
    try {
      // Fetch all files with a large limit to get workflows
      const response = await axios.get(`${backend_url}/${API_ENDPOINTS.GET_PER_TYPE}`, {
        headers: {
          'nonce': session?.nonce,
        },
        params: {
          page: 1,
          limit: 1000000, // Large limit to fetch all files
          claim_types: JSON.stringify(allowedWorkflowsForIdentityCard),
        }
      })

      const workflowFiles = response.data.aquaTrees || []

      // Filter only allowed workflow files for identity cards
      // const filteredWorkflows = allFiles.filter((file: ApiFileInfo) => {
      //   if (!file.aquaTree) return false
      //   const { isWorkFlow, workFlow } = isWorkFlowData(file.aquaTree, systemAquaFileNames)
      //   // Only include workflows that are in the allowed list
      //   return isWorkFlow && workFlow && allowedWorkflowsForIdentityCard.includes(workFlow)
      // })

      setWorkflowFiles(workflowFiles)
    } catch (error) {
      console.error('Error loading workflows:', error)
      toast.error('Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelected = (file: ApiFileInfo) => {
    // Use functional update to prevent duplicates even if called multiple times
    setSelectedWorkflows(prev => {
      const fileGenesisHash = getGenesisHash(file.aquaTree!)
      const isAlreadySelected = prev.some(
        (f: ApiFileInfo) => getGenesisHash(f.aquaTree!) === fileGenesisHash
      )

      if (!isAlreadySelected) {
        return [...prev, file]
      }
      return prev
    })
  }

  const handleFileDeselected = (file: ApiFileInfo) => {
    const newData = selectedWorkflows.filter(
      (f: ApiFileInfo) => getGenesisHash(f.aquaTree!) !== getGenesisHash(file.aquaTree!)
    )
    setSelectedWorkflows(newData)
  }

  const saveAquaTree = async (
    aquaTree: AquaTree,
    fileObject: FileObject,
    isFinal: boolean = false
  ) => {
    try {
      const url = `${backend_url}/explorer_aqua_file_upload`
      const formData = new FormData()

      // Add the aquaTree as a JSON file
      const aquaTreeBlob = new Blob([JSON.stringify(aquaTree)], {
        type: 'application/json',
      })
      const assetContentBlob = new Blob([fileObject.fileContent as string], {
        type: 'application/json',
      })
      formData.append('file', aquaTreeBlob, fileObject.fileName)
      formData.append('asset', assetContentBlob, fileObject.fileName)
      formData.append('account', session?.address || '')
      formData.append('is_workflow', 'false')
      formData.append('has_asset', 'true')

      console.log("Submitting Aqua Tree:", aquaTree)
      console.log("Submitting fileobject:", fileObject)


      // throw new Error('Debugging stop')

      const response = await axios.post(url, formData, {
        headers: {
          nonce: session?.nonce,
        },
      })

      if (response.status === 200 || response.status === 201) {
        if (isFinal) {
          // const filesApi = await fetchFiles(
          //   session!.address,
          //   `${backend_url}/explorer_files`,
          //   session!.nonce
          // )
          // setFiles({
          //   fileData: filesApi.files,
          //   pagination: filesApi.pagination,
          //   status: 'loaded'
          // })

          toast.success('Identity card created successfully')

          // Trigger file reloads
          await triggerWorkflowReload(RELOAD_KEYS.aqua_files, false)
          await triggerWorkflowReload(RELOAD_KEYS.all_files, false)
          await triggerWorkflowReload(RELOAD_KEYS.identity_card, true)

          return {
            aquaTree,
            fileObject
          }
        }
      }
    } catch (error) {
      toast.error('Error creating identity card')
      throw error
    }
  }

  const createIdentityCard = async (shouldShare: boolean = false) => {
    try {
      if (selectedWorkflows.length === 0) {
        toast.error('Please select at least one workflow')
        return
      }

      if (shouldShare) {
        setIsSharing(true)
        toast.info('Creating identity card for sharing...', { duration: 4000 })
      } else {
        setIsSaving(true)
        toast.info('Saving identity card...', { duration: 4000 })
      }

      let allFileObjects: Array<FileObject> = []
      const randomNumber = getRandomNumber(100, 1000)
      let date = timeToHumanFriendly(new Date().toISOString(), true)
      let dateFormatted = date
        .replace(/,/g, '')
        .replace(/:/g, '_')
        .replace(/ /g, '_')
      let fileName = `identity_card_${dateFormatted}_${randomNumber}.json`

      let completeFormData = {
        "total_workflows": selectedWorkflows.length,
        "wallet_address": walletAddress,
        "workflows_included": selectedWorkflows.map((e) => {
          const { workFlow } = isWorkFlowData(e.aquaTree!, systemAquaFileNames)
          return workFlow
        }).toString()
      }

      const estimateSize = estimateFileSize(JSON.stringify(completeFormData))
      const jsonString = JSON.stringify(completeFormData, null, 4)

      const fileObject: FileObject = {
        fileContent: jsonString,
        fileName: fileName,
        path: './',
        fileSize: estimateSize,
      }
      allFileObjects.push(fileObject)

      let aquafier = new Aquafier()
      const genesisAquaTree = await aquafier.createGenesisRevision(fileObject, true, false, false)

      if (genesisAquaTree.isErr()) {
        toast.error('Error creating identity card')
        throw new Error('Error creating genesis aqua tree')
      }

      let currentAquaTree = genesisAquaTree.data.aquaTree

      // Link identity card template
      try {
        const url = ensureDomainUrlHasSSL(`${backend_url}/fetch_template_aqua_tree`)
        const response = await axios.post(url, {
          template_name: 'identity_card',
          name: 'Identity Card Template',
        }, {
          headers: {
            nonce: session?.nonce,
          },
        })

        let jsonData
        if (typeof response.data.templateData === 'string') {
          let jsonDataString = response.data.templateData
          jsonData = JSON.parse(jsonDataString)
        } else {
          jsonData = response.data.templateData
        }
        jsonData.wallet_address = walletAddress

        let templateAquaTree
        if (typeof response.data.aquaTree === 'string') {
          let aquaTreeString = response.data.aquaTree
          templateAquaTree = JSON.parse(aquaTreeString) as AquaTree
        } else {
          templateAquaTree = response.data.aquaTree as AquaTree
        }

        const mainAquaTreeWrapper: AquaTreeWrapper = {
          aquaTree: currentAquaTree!!,
          revision: '',
          fileObject: fileObject,
        }

        allFileObjects.push({
          fileContent: JSON.stringify(templateAquaTree),
          fileName: 'identity_card.json.aqua.json',
          path: "./",
          fileSize: 0,
        })

        const linkedToAquaTreeWrapper: AquaTreeWrapper = {
          aquaTree: templateAquaTree!,
          revision: '',
          fileObject: {
            fileContent: JSON.stringify(jsonData),
            fileName: 'identity_card.json',
            path: "./",
            fileSize: 0,
          },
        }

        const linkedAquaTreeResponse = await aquafier.linkAquaTree(
          mainAquaTreeWrapper,
          linkedToAquaTreeWrapper
        )

        if (linkedAquaTreeResponse.isErr()) {
          throw new Error('Error linking aqua tree')
        }

        currentAquaTree = linkedAquaTreeResponse.data.aquaTree
      } catch (error) {
        console.error("Error fetching template aqua tree:", error)
        toast.error("Error fetching identity card template")
        return
      }

      // Link selected workflows
      for (let index = 0; index < selectedWorkflows.length; index++) {
        const element = selectedWorkflows[index]

        const mainAquaTreeWrapper: AquaTreeWrapper = {
          aquaTree: currentAquaTree!!,
          revision: '',
          fileObject: fileObject,
        }

        const linkedAquaTreeFileObj = getAquaTreeFileObject(element)
        if (!linkedAquaTreeFileObj) {
          throw new Error('Workflow file has error')
        }

        allFileObjects.push(linkedAquaTreeFileObj)
        const linkedToAquaTreeWrapper: AquaTreeWrapper = {
          aquaTree: element.aquaTree!,
          revision: '',
          fileObject: linkedAquaTreeFileObj,
        }

        const linkedAquaTreeResponse = await aquafier.linkAquaTree(
          mainAquaTreeWrapper,
          linkedToAquaTreeWrapper
        )

        if (linkedAquaTreeResponse.isErr()) {
          throw new Error('Error linking workflow')
        }

        currentAquaTree = linkedAquaTreeResponse.data.aquaTree
      }

      console.log("Current Aqua Tree:", currentAquaTree)

      // Save the identity card
      const result = await saveAquaTree(currentAquaTree!, fileObject, true)

      if (shouldShare && result) {
        // Create the item to share
        const identityCardItem: ApiFileInfo = {
          aquaTree: result.aquaTree,
          fileObject: [result.fileObject],
          linkedFileObjects: [],
          mode: '',
          owner: ''
        }

        setSelectedFileInfo(identityCardItem)
        setOpenDialog({
          dialogType: 'share_dialog',
          isOpen: true,
          onClose: () => setOpenDialog(null),
          onConfirm: () => {}
        })
      }

      onClose()
    } catch (error) {
      console.error("Error creating identity card:", error)
      toast.error("Error creating identity card")
    } finally {
      setIsSaving(false)
      setIsSharing(false)
    }
  }

  const handleSave = () => {
    createIdentityCard(false)
  }

  // const handleShareCard = () => {
  //   createIdentityCard(true)
  // }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="[&>button]:hidden sm:!max-w-[85vw] sm:!w-[85vw] sm:h-[85vh] sm:max-h-[85vh] !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Create Identity Card
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Select workflows to include in your identity card
                </p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 px-6 py-4 space-y-6 overflow-auto">
          <div className="space-y-6 flex flex-col flex-1">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="p-1 bg-blue-100 rounded">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-blue-900 text-sm">Important Note</h5>
                  <p className="text-sm text-blue-700 mt-1">
                    Select the claim workflows you want to include in your identity card. Only claim-type workflows (identity, domain, email, phone, etc.) are shown below.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h5 className="text-sm font-semibold text-gray-900">
                Selected Workflows: {selectedWorkflows.length}
              </h5>
              {selectedWorkflows.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedWorkflows.map((workflow) => {
                    const { workFlow } = isWorkFlowData(workflow.aquaTree!, systemAquaFileNames)
                    const genesisHash = getGenesisHash(workflow.aquaTree!)
                    return (
                      <div
                        key={genesisHash}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                      >
                        {workFlow?.replace(/_/g, ' ')}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col flex-1">
              <h5 className="text-sm font-semibold text-gray-900 mb-4">
                Select workflows to include:
              </h5>

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="flex flex-col items-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-600 font-medium">Loading workflows...</span>
                  </div>
                </div>
              ) : workflowFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <CheckSquare className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No claim workflows found</p>
                  <p className="text-xs mt-1">Create claim workflows (identity, domain, email, etc.) to include in your identity card</p>
                </div>
              ) : (
                <div className="overflow-hidden flex-1 px-2">
                  <FilesList
                    showFileActions={false}
                    selectedFiles={selectedWorkflows}
                    activeFile={null}
                    showCheckbox={true}
                    showHeader={false}
                    onFileDeSelected={handleFileDeselected}
                    onFileSelected={handleFileSelected}
                    hideAllFilesAndAquaFiles={true}
                    allowedWorkflows={allowedWorkflowsForIdentityCard}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <div className="flex justify-between w-full gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving || isSharing}
            >
              Cancel
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving || isSharing || selectedWorkflows.length === 0}
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Card
                  </>
                )}
              </Button>

              {/* <Button
                onClick={handleShareCard}
                disabled={isSaving || isSharing || selectedWorkflows.length === 0}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Card
                  </>
                )}
              </Button> */}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default IdentityCardDialogUi
