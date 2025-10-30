import { createSignal, createEffect, onMount, Show, For } from 'solid-js'
import { FileText, X } from 'lucide-solid'
import axios from 'axios'
import { appStore, appStoreActions } from '../../store'
import type { Contract } from '../../types/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { SharedContract } from './files_shared_contracts_item'

export const SharedContracts = () => {
  // --- Local reactive state ---
  const [searchQuery, setSearchQuery] = createSignal('')
  const [sharedContracts, setSharedContracts] = createSignal<Contract[]>([])

  // --- Global store access ---
  const { backend_url, session, contracts } = appStore
  const { setContracts } = appStoreActions

  // --- Load contracts from backend ---
  const loadAccountSharedContracts = async () => {
    if (!session) return

    try {
      const url = `${backend_url}/contracts`
      const response = await axios.get(url, {
        params: {
          receiver: session?.address,
          sender: session?.address,
        },
        headers: { nonce: session?.nonce },
      })

      if (response.status === 200) {
        setContracts(response.data?.contracts || [])
      }
    } catch (error) {
      console.error(error)
    }
  }

  onMount(() => {
    loadAccountSharedContracts()
  })

  // --- Filter contracts whenever they or the query change ---
  createEffect(() => {
    const query = searchQuery().toLowerCase()
    const filtered = contracts.filter(
      (contract) =>
        contract.hash.toLowerCase().includes(query) ||
        contract.sender?.toLowerCase().includes(query) ||
        contract.receiver?.toLowerCase().includes(query)
    )
    setSharedContracts(filtered)
  })

  const incomingContracts = () =>
    sharedContracts()
      .filter((c) =>
        c.recipients?.map((r) => r.toLowerCase()).includes(session?.address?.toLowerCase() || '')
      )
      .sort(
        (a, b) =>
          (b.created_at ? new Date(b.created_at).getTime() : 0) -
          (a.created_at ? new Date(a.created_at).getTime() : 0)
      )

  const outgoingContracts = () =>
    sharedContracts()
      .filter((c) => c.sender?.toLowerCase() === session?.address?.toLowerCase())
      .sort(
        (a, b) =>
          (b.created_at ? new Date(b.created_at).getTime() : 0) -
          (a.created_at ? new Date(a.created_at).getTime() : 0)
      )

  return (
    <div class="flex flex-col gap-2">
      {/* Header */}
      <div class="flex items-center gap-3 mt-5">
        <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <FileText class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Shared Contracts</h2>
          <p class="text-sm text-gray-500 mt-1">{contracts.length} contracts available</p>
        </div>
      </div>

      <div class="flex flex-col h-full">
        <div class="flex-1 overflow-auto p-0 space-y-4">
          <Tabs defaultValue="incoming">
            <TabsList>
              <TabsTrigger value="incoming">Inbox</TabsTrigger>
              <TabsTrigger value="outgoing">Shared</TabsTrigger>
            </TabsList>

            {/* --- Incoming --- */}
            <TabsContent value="incoming">
              <Show when={incomingContracts().length > 0} fallback={
                <div class="card">
                  <Alert variant="default">
                    <X />
                    <AlertTitle>Shared Contracts</AlertTitle>
                    <AlertDescription>No incoming contracts</AlertDescription>
                  </Alert>
                </div>
              }>
                <For each={incomingContracts()}>
                  {(contract, index) => (
                    <SharedContract
                      type="incoming"
                      contract={contract}
                      index={index()}
                      contractDeleted={(hash) => {
                        setSharedContracts(sharedContracts().filter((c) => c.hash !== hash))
                      }}
                    />
                  )}
                </For>
              </Show>
            </TabsContent>

            {/* --- Outgoing --- */}
            <TabsContent value="outgoing">
              <Show when={outgoingContracts().length > 0} fallback={
                <div class="card">
                  <Alert variant="default">
                    <X />
                    <AlertTitle>Shared Contracts</AlertTitle>
                    <AlertDescription>No outgoing contracts</AlertDescription>
                  </Alert>
                </div>
              }>
                <For each={outgoingContracts()}>
                  {(contract, index) => (
                    <SharedContract
                      type="outgoing"
                      contract={contract}
                      index={index()}
                      contractDeleted={(hash) => {
                        setSharedContracts(sharedContracts().filter((c) => c.hash !== hash))
                      }}
                    />
                  )}
                </For>
              </Show>
            </TabsContent>
          </Tabs>

          <Show when={sharedContracts().length === 0}>
            <div class="text-center py-12">
              <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FileText class="w-8 h-8 text-gray-400" />
              </div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
              <p class="text-gray-500">
                {searchQuery()
                  ? 'Try adjusting your search terms'
                  : 'No shared contracts available'}
              </p>
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}

export default function FilesSharedContracts() {
  return (
    <div class="container mx-auto max-w-4xl px-0 py-6">
      <SharedContracts />
    </div>
  )
}
