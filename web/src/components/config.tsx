import axios from 'axios'
import { useEffect } from 'react'
import { ensureDomainUrlHasSSL, fetchSystemFiles, generateAvatar, getCookie } from '../utils/functions'
import { useStore } from 'zustand'
import appStore from '../store'
import { ethers } from 'ethers'
import { toast } from 'sonner'
import { FormTemplate } from './aqua_forms'
import { SESSION_COOKIE_NAME } from '@/utils/constants'

const LoadConfiguration = () => {
      const { setMetamaskAddress, setUserProfile, setFiles, setAvatar, setSystemFileInfo, backend_url, setSession, setFormTemplate, setIsAdmin, session } = useStore(appStore)

      const fetchAddressGivenANonce = async (nonce: string) => {
            if (!backend_url.includes('0.0.0.0') && !session?.address) {
                  try {

                        const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
                        const response = await axios.get(url, {
                              params: { nonce: nonce }, // This is the correct way to pass query params
                              headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                              },
                        })

                        if (response.status === 200) {

                              const _address = response.data?.session.address
                              if (_address) {
                                    const address = ethers.getAddress(_address)
                                    setMetamaskAddress(address)
                                    const avatar = generateAvatar(address)
                                    setAvatar(avatar)
   fetchUserProfile(_address, nonce)
                                    setSession(response.data?.session)
                                    //`${backend_url}/system/aqua_tree`
                                    const url3 = ensureDomainUrlHasSSL(`${backend_url}/system/aqua_tree`)
                                    const systemFiles = await fetchSystemFiles(url3, address)
                                    setSystemFileInfo(systemFiles)
                              }
                        }
                  } catch (error: any) {
                        setMetamaskAddress(null)
                        setAvatar(undefined)
                        setSession(null)
                        setFiles({
                              fileData: [],
                              status: 'error',
                              error: error instanceof Error ? error.message : 'Unknown error from config',
                        })
                        setUserProfile({
                              ens_name: '',
                              user_pub_key: '',
                              cli_pub_key: '',
                              cli_priv_key: '',
                              alchemy_key: 'ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ',
                              witness_network: '',
                              theme: 'light',
                              enable_dba_claim: false,
                              witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                        })
                  }
            }
      }

      const fetchUserProfile = async (address: string, nonce: string) => {
            //`${backend_url}/explorer_fetch_user_settings`
            const url = ensureDomainUrlHasSSL(`${backend_url}/explorer_fetch_user_settings`)

            const response = await axios.get(url, {
                  headers: {
                        metamask_address: address,
                        nonce: nonce,
                  },
            })

            if (response.status === 200) {
                  setUserProfile({
                        ...response.data.data,
                  })
            }
      }

      useEffect(() => {
            if (!backend_url.includes('0.0.0.0')) {
                  const nonce = getCookie(SESSION_COOKIE_NAME)
                  if (nonce) {
                        fetchAddressGivenANonce(nonce)
                  } else {
                        setMetamaskAddress(null)
                        setAvatar(undefined)
                        setSession(null)
                        setFiles({
                              fileData: [],
                              status: 'idle',
                        })
                        setUserProfile({
                              ens_name: '',
                              user_pub_key: '',
                              cli_pub_key: '',
                              cli_priv_key: '',
                              alchemy_key: 'ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ',
                              witness_network: '',
                              theme: 'light',
                              enable_dba_claim: false,
                              witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                        })
                  }
            } else {
            }
      }, [backend_url])

      const loadTemplates = async () => {
            try {
                  const url = ensureDomainUrlHasSSL(`${backend_url}/templates`)
                  const response = await axios.get(url, {
                        headers: {
                              nonce: session?.nonce,
                        },
                  })

                  if (response.status === 200 || response.status === 201) {
                        const loadedTemplates: FormTemplate[] = response.data.data
                        setFormTemplate(loadedTemplates)
                  }
            } catch (error) {
                  toast.error('Error loading templates', {
                        description: error instanceof Error ? error.message : 'Unknown error',
                  })
            } finally {
                  // setIsLoading(false);
            }
      }

      const checkAdminStatus = async () => {
            if (!session?.nonce || !backend_url) {
                  setIsAdmin(false)
                  return
            }

            try {
                  const url = ensureDomainUrlHasSSL(`${backend_url}/admin/check`)
                  const response = await axios.get(url, {
                        headers: {
                              nonce: session.nonce,
                        },
                  })

                  if (response.status === 200 && response.data?.isAdmin) {
                        setIsAdmin(true)
                  } else {
                        setIsAdmin(false)
                  }
            } catch (error) {
                  // If the endpoint returns 403 or any other error, user is not an admin
                  setIsAdmin(false)
            }
      }

      useEffect(() => {
            if (session?.nonce) {
                  loadTemplates()
                  checkAdminStatus()
            } else {
                  setIsAdmin(false)
            }
      }, [session?.nonce])



      return <></>
}

export default LoadConfiguration
