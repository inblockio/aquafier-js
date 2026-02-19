import { ApiFileInfo } from '@/models/FileInfo'
import appStore from '@/store'
import {
      ensureDomainUrlHasSSL,
      getGenesisHash,
      isWorkFlowData,
} from '@/utils/functions'
import { OrderRevisionInAquaTree } from 'aqua-js-sdk'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { AquaSystemNamesService } from '@/storage/databases/aquaSystemNames'
import { useLiveQuery } from 'dexie-react-hooks'
import { contactsDB } from '@/storage/databases/contactsDb'
import apiClient from '@/api/axiosInstance'
import { IClaim } from '@/pages/v2_claims_workflow/ClaimCard'

const REQUIRED_CLAIMS = ['simple_claim', 'domain_claim', 'identity_claim', 'phone_number_claim', 'email_claim', 'user_signature', 'ens_claim']

interface UseProfileClaimsParams {
      walletAddress?: string
      files?: ApiFileInfo[]
}

export function useProfileClaims({ walletAddress, files }: UseProfileClaimsParams) {
      const { session, backend_url } = useStore(appStore)
      const [claims, setClaims] = useState<IClaim[]>([])
      const [loading, setLoading] = useState(true)
      const [isLoading, setIsLoading] = useState<boolean>(true)
      const [ensName, setEnsName] = useState<string | null>(null)

      // Watch this specific contact in IndexedDB for live updates
      const contactProfile = useLiveQuery(
            () => walletAddress ? contactsDB.contacts.get(walletAddress) : undefined,
            [walletAddress]
      )

      const loadSystemAquaFileNames = async () => {
            const aquaSystemNamesService = AquaSystemNamesService.getInstance();
            const systemNames = await aquaSystemNamesService.getSystemNames();
            return systemNames;
      }

      const loadWorkflows = async () => {
            if (!walletAddress || !session?.nonce) return
            setIsLoading(true);
            try {
                  let _files: ApiFileInfo[] = []
                  let systemWorkflowNames: string[] = await loadSystemAquaFileNames()
                  // console.log(systemWorkflowNames)
                  // Load profile from db based on wallet address
                  if (files && files.length > 0) {
                        _files = files;
                  } else {
                        // Load contact profile from IndexedDB
                        const { ContactsService } = await import('@/storage/databases/contactsDb');
                        const contactsService = ContactsService.getInstance();
                        const contactProfile = await contactsService.getContactByAddress(walletAddress);
                        // console.log("contactProfile", contactProfile)
                        if (contactProfile && contactProfile.files) {
                              _files = contactProfile.files;
                        }
                  }
                  // console.log("files", files, _files, walletAddress)
                  processFilesToGetWorkflows(_files, systemWorkflowNames);
            } catch (error) {
                  console.error('Failed to load workflows:', error);
                  // Consider setting an error state here
            } finally {
                  setIsLoading(false);
            }
      };

      const processFilesToGetWorkflows = (files: ApiFileInfo[], systemWorkflowNames: string[]) => {

            setLoading(true)

            if (files && files.length > 0) {
                  let attestationFiles = files.filter(file => {
                        const fileInfo = isWorkFlowData(file.aquaTree!, systemWorkflowNames)
                        return fileInfo.isWorkFlow && fileInfo.workFlow === 'identity_attestation'
                  })

                  const localClaims: IClaim[] = []
                  // let _totalAttestations = 0
                  for (let i = 0; i < files.length; i++) {
                        const aquaTree = files[i].aquaTree
                        if (aquaTree) {
                              const { isWorkFlow, workFlow } = isWorkFlowData(aquaTree!, systemWorkflowNames)

                              if (isWorkFlow && REQUIRED_CLAIMS.includes(workFlow)) {

                                    const orderedAquaTree = OrderRevisionInAquaTree(aquaTree)
                                    const revisionHashes = Object.keys(orderedAquaTree.revisions)
                                    const firstRevisionHash = revisionHashes[0]
                                    const firstRevision = orderedAquaTree.revisions[firstRevisionHash]
                                    const _wallet_address = firstRevision.forms_wallet_address
                                    if (walletAddress === _wallet_address) {
                                          // setSelectedFileInfo(files[i])
                                          // firstClaim = files[i]
                                          let attestationsCount = 0

                                          // Lets get all Attestation for this claim
                                          for (let a = 0; a < attestationFiles.length; a++) {
                                                let attestationFile = attestationFiles[a]
                                                let attestationAquaTree = attestationFile?.aquaTree!
                                                let attestationFileGenesisHash = getGenesisHash(attestationAquaTree)!
                                                let genesisRevision = attestationAquaTree.revisions[attestationFileGenesisHash]
                                                // TODO: Do we have to countercheck the wallet addresses too!
                                                // if (genesisRevision.forms_claim_wallet_address === _wallet_address
                                                //       && genesisRevision.forms_identity_claim_id === firstRevisionHash) {
                                                //       attestationsCount += 1
                                                // }
                                                if (genesisRevision.forms_identity_claim_id === firstRevisionHash) {
                                                      attestationsCount += 1
                                                }
                                          }

                                          // _totalAttestations += attestationsCount
                                          let claimName = ""
                                          if (workFlow === 'simple_claim' || workFlow === 'identity_claim' || workFlow === 'user_signature') {
                                                claimName = firstRevision.forms_name ?? firstRevision.forms_domain
                                          } else if (workFlow === 'domain_claim' || workFlow === 'dns_claim') {
                                                claimName = firstRevision.forms_domain
                                          } else if (workFlow === 'phone_number_claim') {
                                                claimName = firstRevision.forms_phone_number
                                          } else if (workFlow === 'email_claim') {
                                                claimName = firstRevision.forms_email
                                          } else if (workFlow === 'ens_claim') {
                                                claimName = firstRevision.forms_ens_name
                                          }
                                          let claimInformation: IClaim = {
                                                claimType: workFlow,
                                                claimName: claimName,
                                                attestationsCount: attestationsCount,
                                                apiFileInfo: files[i],
                                          }
                                          localClaims.push(claimInformation)
                                    }
                              }
                        }
                  }

                  setClaims(localClaims)
                  // setTotalAttestations(_totalAttestations)
            }
            setLoading(false)
      }

      const loadEnsName = async () => {
            if (!session && !backend_url) {
                  return
            }
            try {
                  const url = ensureDomainUrlHasSSL(`${backend_url}/resolve/${session?.address}?useEns=true`)
                  const response = await apiClient.get(url, {
                        headers: {
                              metamask_address: session?.address!,
                              'nonce': session?.nonce!,
                              'Content-Type': 'application/json'
                        }
                  });

                  if (response.data.success) {
                        setEnsName(response.data.result);
                  }
            } catch (_err) {
                  // console.error('Resolution error:', err);
            }

      }

      useEffect(() => {
            if (walletAddress && session?.nonce) {
                  loadWorkflows()
            } else {
                  setIsLoading(false)
                  setLoading(false)
            }
      }, [walletAddress, session?.nonce, files, contactProfile])

      useEffect(() => {
            if (session?.address && session.nonce && backend_url) {
                  loadEnsName()
            }
      }, [session, backend_url])

      return {
            claims,
            loading,
            isLoading,
            ensName,
            contactProfile,
      }
}
