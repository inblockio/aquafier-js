import { createSignal, createEffect, onMount, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import axios from 'axios'
import { toast } from 'sonner'

import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip'
import { CircleCheckBigIcon, Hash, Users, Wallet } from 'lucide-solid'

import { appStore } from '../../store'
import { arraysEqualIgnoreOrder, formatCryptoAddress, getGenesisHash, timeToHumanFriendly } from '../../utils/functions'
import WalletAddresClaim from '../claims_workflow/WalletAdrressClaim'
import { ApiFileInfo } from '../../models/FileInfo'

import type { Contract } from '../../types/types'
import { ImportAquaChainFromChain } from '../../components/dropzone_file_actions/import_aqua_tree_from_aqua_tree'

export const SharedContract = (props: {
  type: 'outgoing' | 'incoming'
  contract: Contract
  index: number
  contractDeleted: (hash: string) => void
}) => {
  const navigate = useNavigate()
  const { backend_url, session, files } = appStore

  const [loading, setLoading] = createSignal(false)
  const [exactMatchFound, setExactMatchFound] = createSignal(false)
  const [loadingSharedFileData, setLoadingSharedFileData] = createSignal(true)
  const [genesisMatch, setGenesisMatch] = createSignal(false)
  const [fileInfo, setFileInfo] = createSignal<ApiFileInfo | null>(null)
  const [contractData, setContractData] = createSignal<any | null>(null)

  const getStatusFromLatest = (latest?: string) => {
    if (!latest) return 'unknown'
    try {
      const parsed = JSON.parse(latest)
      return parsed.status || 'unknown'
    } catch {
      return 'unknown'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  async function deleteContract() {
    setLoading(true)
    try {
      const response = await axios.delete(`${backend_url}/contracts/${props.contract.hash}`, {
        headers: { nonce: session?.nonce },
      })

      if (response.status === 200 || response.status === 201) {
        props.contractDeleted(props.contract.hash)
        toast.success('Contract deleted successfully')
      }
    } catch (error: any) {
      toast.error(`Error deleting contract: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadPageData = async () => {
    try {
      setLoadingSharedFileData(true)
      const url = `${backend_url}/share_data/${props.contract.hash}`
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          nonce: session?.nonce ?? '',
        },
      })

      const apiFile = response.data.data.displayData[0] as ApiFileInfo
      if (apiFile) {
        setContractData(response.data.data.contractData)
        setFileInfo(apiFile)

        const contractFileGenHash = getGenesisHash(apiFile.aquaTree!)
        for (const fileItem of files.fileData) {
          const currentGenesisHash = getGenesisHash(fileItem.aquaTree!)
          if (currentGenesisHash === contractFileGenHash) {
            setGenesisMatch(true)
            const allHashesInFileItem = Object.keys(fileItem.aquaTree!.revisions)
            const allHashesInContract = Object.keys(apiFile.aquaTree!.revisions)
            if (arraysEqualIgnoreOrder(allHashesInFileItem, allHashesInContract)) {
              setExactMatchFound(true)
            }
            break
          }
        }
      }
    } catch (error: any) {
      const status = error.response?.status
      if (status === 404) toast.error('File could not be found (probably deleted)')
      else if (status === 412) toast.error('No permission for access.')
      else toast.error(`Error fetching data: ${error.message}`)
    } finally {
      setLoadingSharedFileData(false)
    }
  }

  onMount(() => {
    if (props.contract.hash) loadPageData()
  })

  return (
    <Card
      class="hover:shadow-md transition-shadow cursor-pointer border border-gray-200 my-2"
      id={props.contract.hash}
    >
      <CardContent class="p-2 sm:p-6 relative">
        <div class="flex items-start justify-between">
          <div class="flex-1 space-y-4">
            {/* Contract Hash */}
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Hash class="h-3 text-gray-600" />
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-xs sm:text-sm font-medium text-gray-900 font-mono">File Name:</span>
                  <code class="text-xs sm:text-sm font-mono bg-gray-100 px-2 py-1 rounded break-all">
                    {props.contract.file_name}
                  </code>
                </div>
                <Show when={props.contract.created_at}>
                  <p class="text-xs text-gray-500 mt-1">
                    {timeToHumanFriendly(props.contract.created_at!, true)}
                  </p>
                </Show>
              </div>
            </div>

            {/* Participants */}
            <div class="grid grid-cols-2 gap-4">
              {/* Sender */}
              <div>
                fix me
                {/* <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div class="flex items-center gap-2">
                        <Avatar class="w-6 h-6">
                          <AvatarFallback class="text-xs bg-blue-100 text-blue-600">
                            <Wallet class="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p class="text-xs sm:text-sm font-medium text-gray-900 font-mono truncate">
                            <WalletAddresClaim walletAddress={props.contract.sender!} isShortened={true} />
                          </p>
                          <p class="text-xs text-gray-500">Sender</p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p class="font-mono text-xs">{props.contract.sender}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider> */}
              </div>

              {/* Receivers */}
              <div>
                <h3 class="text-md text-gray-900">Receivers</h3>
                <div class="flex flex-col gap-2">
                  <For each={props.contract.recipients}>
                    {(recipient, _idx) => (
                      <div class="flex items-center gap-2">
                        <Avatar class="w-6 h-6">
                          <AvatarFallback class="text-xs bg-green-100 text-green-600">
                            <Wallet class="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p class="text-xs sm:text-sm font-medium text-gray-900 font-mono truncate">
                            <WalletAddresClaim walletAddress={recipient} isShortened={false} />
                          </p>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>

            {/* Status and Buttons */}
            <div class="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2 sm:gap-4">
                <Badge
                  variant="outline"
                  class={`${getStatusColor(getStatusFromLatest(props.contract.latest))} text-xs px-2`}
                >
                  {formatCryptoAddress(props.contract.latest, 5, 6)}
                </Badge>

                <Show when={props.contract.option}>
                  <div class="flex items-center gap-1 text-sm text-gray-600">
                    <span class="w-2 h-2 rounded-full bg-gray-400"></span>
                    <span class="capitalize">{props.contract.option}</span>
                  </div>
                </Show>

                <Show when={props.contract.reference_count !== undefined}>
                  <div class="flex items-center gap-1 text-sm text-gray-600">
                    <Users class="w-4 h-4" />
                    <span>{props.contract.reference_count} refs</span>
                  </div>
                </Show>
              </div>

              <div class="grid grid-cols-2 gap-2 w-full">
                <Show
                  when={genesisMatch()}
                  fallback={
                    <Show when={fileInfo()}>
                      <ImportAquaChainFromChain
                        showButtonOnly={true}
                        fileInfo={fileInfo()!}
                        contractData={contractData()}
                        isVerificationSuccessful={true}
                      />
                    </Show>
                  }
                >
                  <Button
                    data-testid={`open-shared-contract-button-${props.index}`}
                    variant="default"
                    size="sm"
                    class="w-full"
                    onClick={() => navigate(`/app/shared-contracts/${props.contract.hash}`)}
                  >
                    Review
                  </Button>
                </Show>

                <Button
                  data-testid={`delete-shared-contract-button-${props.index}`}
                  variant="destructive"
                  size="sm"
                  class="w-full"
                  disabled={loading()}
                  onClick={deleteContract}
                >
                  {loading() ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>

          {/* Right-top check indicator */}
          <Show when={props.type === 'incoming'}>
            <div class="absolute top-0 right-0">
              <CheckIfAquaTreeIsImported
                loadingSharedFileData={loadingSharedFileData()}
                exactMatchFound={exactMatchFound()}
              />
            </div>
          </Show>
        </div>
      </CardContent>
    </Card>
  )
}

// ✅ CheckIfAquaTreeIsImported
export const CheckIfAquaTreeIsImported = (props: {
  loadingSharedFileData: boolean
  exactMatchFound: boolean
}) => {
  return (
    <Show
      when={props.loadingSharedFileData}
      fallback={
        <Show
          when={props.exactMatchFound}
          fallback={<div />}
        >
          <div class="flex-shrink-0 ml-4">
            <Button
              variant="default"
              size="sm"
              class="bg-green-600 hover:bg-green-700 text-white"
              onClick={(e) => {
                e.stopPropagation()
                console.log('Green button clicked')
              }}
            >
              File has been Imported <CircleCheckBigIcon />
            </Button>
          </div>
        </Show>
      }
    >
      <Button
        variant="default"
        size="sm"
        class="bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400 disabled:cursor-not-allowed"
        disabled={true}
      >
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <span>checking if file is imported...</span>
        </div>
      </Button>
    </Show>
  )
}