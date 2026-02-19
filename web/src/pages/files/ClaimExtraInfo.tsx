import { ApiFileInfo } from '@/models/FileInfo'
import {
      capitalizeWords,
      formatCryptoAddress,
      getGenesisHash,
} from '@/utils/functions'
import { useStore } from 'zustand'
import appStore from '@/store'
import WalletAddressClaim from '../v2_claims_workflow/WalletAddressClaim'

interface ClaimExtraInfoProps {
      file: ApiFileInfo
      workflowInfo: {
            isWorkFlow: boolean
            workFlow: string
      }
}

export default function ClaimExtraInfo({ file, workflowInfo }: ClaimExtraInfoProps) {
      const { session } = useStore(appStore)

      if (workflowInfo.workFlow == "user_profile") {
            let genesisHash = getGenesisHash(file.aquaTree!)
            if (!genesisHash) {
                  return <div />
            }
            let genRevision = file.aquaTree?.revisions[genesisHash]
            if (!genRevision) {
                  return <div />
            }
            let creatorWallet = genRevision[`forms_wallet_address`]


            if (creatorWallet) {
                  return <>

                        <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                              <p className="text-xs ">Profile Owner   {session?.address === creatorWallet ? <>(You)</> : <></>}: &nbsp;</p>
                              <WalletAddressClaim walletAddress={creatorWallet} />

                        </div>

                  </>
            }
      }
      if (workflowInfo.workFlow == "identity_claim") {
            let genesisHash = getGenesisHash(file.aquaTree!)
            if (!genesisHash) {
                  return <div />
            }
            let genRevision = file.aquaTree?.revisions[genesisHash]
            if (!genRevision) {
                  return <div />
            }

            let creatorWallet = genRevision[`forms_wallet_address`]
            let name = genRevision[`forms_name`]

            if (creatorWallet) {

                  return <>
                        <div className="flex flex-nowrap  text-xs text-gray-500">
                              <p className="text-xs">Name: &nbsp;</p>
                              <p className="text-xs ">{name}</p>
                        </div>
                        <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                              <p className="text-xs ">Owner   {session?.address === creatorWallet ? <>(You)</> : <></>}: &nbsp;</p>
                              <WalletAddressClaim walletAddress={creatorWallet} />
                        </div>

                  </>
            }
      }

      if (workflowInfo.workFlow == "identity_card") {
            let genesisHash = getGenesisHash(file.aquaTree!)
            if (!genesisHash) {
                  return <div />
            }
            let genRevision = file.aquaTree?.revisions[genesisHash]
            if (!genRevision) {
                  return <div />
            }

            let creatorWallet = genRevision[`forms_wallet_address`]

            if (creatorWallet) {

                  return <>
                        <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                              <p className="text-xs ">Owner   {session?.address === creatorWallet ? <>(You)</> : <></>}: &nbsp;</p>
                              <WalletAddressClaim walletAddress={creatorWallet} />
                        </div>

                  </>
            }
      }

      if (workflowInfo.workFlow == "ens_claim") {
            let genesisHash = getGenesisHash(file.aquaTree!)
            if (!genesisHash) {
                  return <div />
            }
            let genRevision = file.aquaTree?.revisions[genesisHash]
            if (!genRevision) {
                  return <div />
            }

            let creatorWallet = genRevision[`forms_wallet_address`]
            let ensName = genRevision[`forms_ens_name`]

            if (creatorWallet) {

                  return <>
                        <div className="flex flex-nowrap  text-xs text-gray-500">
                              <p className="text-xs">ENS Name: &nbsp;</p>
                              <p className="text-xs ">{ensName}</p>
                        </div>
                        <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                              <p className="text-xs ">Owner   {session?.address === creatorWallet ? <>(You)</> : <></>}: &nbsp;</p>
                              <WalletAddressClaim walletAddress={creatorWallet} />
                        </div>

                  </>
            }
      }

      if (workflowInfo.workFlow == "identity_attestation") {
            let genesisHash = getGenesisHash(file.aquaTree!)
            if (!genesisHash) {
                  return <div />
            }
            let genRevision = file.aquaTree?.revisions[genesisHash]
            if (!genRevision) {
                  return <div />
            }

            let creatorWallet = genRevision[`forms_wallet_address`]
            let claimWallet = genRevision[`forms_claim_wallet_address`]
            let claimType = genRevision[`forms_claim_type`] ?? ""
            let attestationType = genRevision[`forms_attestion_type`] ?? ""

            if (creatorWallet) {
                  return <>

                        <div className="flex flex-nowrap  text-xs text-gray-500">
                              {
                                    attestationType == "user" ? <>
                                          <p className="text-xs">Attestation Of : &nbsp;</p>
                                          <p className="text-xs ">{capitalizeWords(claimType.replace(/_/g, ' '))}</p>
                                    </> : <>
                                          <p className="text-xs">Attestation Type : &nbsp;</p>
                                          <p className="text-xs ">Server Attestation</p>
                                    </>
                              }

                        </div>

                        <div className="flex flex-nowrap  text-xs text-gray-500">
                              <p className="text-xs">Claim  Owner: &nbsp;</p>
                              <p className="text-xs ">{formatCryptoAddress(claimWallet)}</p>
                        </div>

                        <div className="flex flex-nowrap  text-xs text-gray-500">
                              <p className="text-xs">Attestor Wallet: &nbsp;</p>
                              <p className="text-xs ">{formatCryptoAddress(creatorWallet)}</p>
                        </div>
                  </>
            }
      }

      if (workflowInfo.workFlow == "domain_claim") {

            let genesisHash = getGenesisHash(file.aquaTree!)
            if (!genesisHash) {
                  return <div />
            }
            let genRevision = file.aquaTree?.revisions[genesisHash]
            if (!genRevision) {
                  return <div />
            }

            let domain = genRevision[`forms_domain`]
            let creatorWallet = genRevision[`forms_wallet_address`]

            if (domain) {
                  return <>
                        <div className="flex flex-nowrap  text-xs text-gray-500">
                              <p className="text-xs">Domain : &nbsp;</p>
                              <p className="text-xs ">{domain}</p>
                        </div>
                        {
                              creatorWallet ?
                                    <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                                          <p className="text-xs ">Owner   {session?.address === creatorWallet ? <>(You)</> : <></>}: &nbsp;</p>
                                          <WalletAddressClaim walletAddress={creatorWallet} />

                                    </div> : null
                        }



                  </>

            }

      }

      if (workflowInfo.workFlow == "aqua_certificate") {

            let genesisHash = getGenesisHash(file.aquaTree!)
            if (!genesisHash) {
                  return <div />
            }
            let genRevision = file.aquaTree?.revisions[genesisHash]
            if (!genRevision) {
                  return <div />
            }

            let creatorWallet = genRevision[`forms_creator`]

            if (creatorWallet) {
                  return <>
                        <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                              <p className="text-xs ">Owner   {session?.address === creatorWallet ? <>(You)</> : <></>}: &nbsp;</p>
                              <WalletAddressClaim walletAddress={creatorWallet} />
                        </div>
                  </>

            }

      }


      if (workflowInfo.workFlow == "email_claim") {

            let genesisHash = getGenesisHash(file.aquaTree!)
            if (!genesisHash) {
                  return <div />
            }
            let genRevision = file.aquaTree?.revisions[genesisHash]
            if (!genRevision) {
                  return <div />
            }

            let phoneNumber = genRevision[`forms_email`]

            if (phoneNumber) {
                  return <div className="flex flex-nowrap  text-xs text-gray-500">
                        <p className="text-xs">Email Address : &nbsp;</p>
                        <p className="text-xs ">{phoneNumber}</p>
                  </div>

            }

      }

      if (workflowInfo.workFlow == "phone_number_claim") {

            let genesisHash = getGenesisHash(file.aquaTree!)
            if (!genesisHash) {
                  return <div />
            }
            let genRevision = file.aquaTree?.revisions[genesisHash]
            if (!genRevision) {
                  return <div />
            }

            let phoneNumber = genRevision[`forms_phone_number`]

            if (phoneNumber) {
                  return <div className="flex flex-nowrap  text-xs text-gray-500">
                        <p className="text-xs">Phone Number : &nbsp;</p>
                        <p className="text-xs ">{phoneNumber}</p>
                  </div>

            }

      }


      if (workflowInfo.workFlow == "user_signature") {
            let genesisHash = getGenesisHash(file.aquaTree!)
            if (!genesisHash) {
                  return <div />
            }
            let genRevision = file.aquaTree?.revisions[genesisHash]
            if (!genRevision) {
                  return <div />
            }

            let createdAt = genRevision[`forms_created_at`]
            let creatorWallet = genRevision[`forms_wallet_address`]

            if (createdAt) {
                  return <>
                        {/* <div className="flex flex-nowrap  text-xs text-gray-500">
                              <p className="text-xs">Created At : &nbsp;</p>
                              <p className="text-xs ">{formatUnixTimestamp(createdAt, true)}</p>
                        </div> */}
                        {
                              creatorWallet ?
                                    <div className="flex flex-nowrap   text-xs text-gray-500" style={{ alignItems: 'center' }}>
                                          <p className="text-xs ">Owner   {session?.address === creatorWallet ? <>(You)</> : <></>}: &nbsp;</p>
                                          <WalletAddressClaim walletAddress={creatorWallet} />

                                    </div> : null
                        }



                  </>

            }

      }

      //add  user signature
      return <div />
}
