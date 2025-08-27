import axios from 'axios'
import { useEffect } from 'react'
import { ensureDomainUrlHasSSL, fetchFiles, fetchSystemFiles, generateAvatar, getCookie } from '../utils/functions'
import { useStore } from 'zustand'
import appStore from '../store'
import { ethers } from 'ethers'
import { toast } from 'sonner'
import { FormTemplate } from './aqua_forms'

const LoadConfiguration = () => {
      const { setMetamaskAddress, setUserProfile, setFiles, setAvatar, setSystemFileInfo, backend_url, setSession, setFormTemplate, session } = useStore(appStore)

      const fetchAddressGivenANonce = async (nonce: string) => {
            if (!backend_url.includes('0.0.0.0')) {
                  try {
                       
                         const url = ensureDomainUrlHasSSL(`${backend_url}/session`)
                        const response = await axios.get(url, {
                              params: { nonce: nonce }, // This is the correct way to pass query params
                              headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                              },
                        })

                        if (response.status === 200) {
                              const url2 = `${backend_url}/explorer_files`
                              const _address = response.data?.session.address
                              //  console.log(`address ${_address} ..`)
                              if (_address) {
                                    const address = ethers.getAddress(_address)
                                    setMetamaskAddress(address)
                                    const avatar = generateAvatar(address)
                                    setAvatar(avatar)
                                    const files = await fetchFiles(address, url2, nonce)
                                    setFiles(files)
                                    fetchUserProfile(_address, nonce)
                                    setSession(response.data?.session)
                                    const url3 = `${backend_url}/system/aqua_tree`
                                    const systemFiles = await fetchSystemFiles(url3, address)
                                    setSystemFileInfo(systemFiles)
                              }
                        }
                  } catch (error: any) {
                        // if (error?.response?.status === 404) {
                        // console.log("Error: ", error)
                        setMetamaskAddress(null)
                        setAvatar(undefined)
                        setSession(null)
                        setFiles([])
                        setUserProfile({
                              ens_name: '',
                              user_pub_key: '',
                              cli_pub_key: '',
                              cli_priv_key: '',
                              alchemy_key: 'ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ',
                              witness_network: '',
                              theme: 'light',
                              witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                        })
                        // } else {
                        //    //  console.log("An error from the api ", error);
                        // }
                  }
            }
      }

      const fetchUserProfile = async (address: string, nonce: string) => {
            const url = `${backend_url}/explorer_fetch_user_settings`
            //  console.log("url is ", url);

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
                  const nonce = getCookie('pkc_nonce')
                  console.log('Fetched nonce from cookies:', nonce)
                  if (nonce) {
                        fetchAddressGivenANonce(nonce)
                  } else {
                        setMetamaskAddress(null)
                        setAvatar(undefined)
                        setSession(null)
                        setFiles([])
                        setUserProfile({
                              ens_name: '',
                              user_pub_key: '',
                              cli_pub_key: '',
                              cli_priv_key: '',
                              alchemy_key: 'ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ',
                              witness_network: '',
                              theme: 'light',
                              witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                        })
                        // toast.info( "You are not logged in! Please login")
                        // window.location.reload()
                  }
            } else {
                  console.log(`backend url is ${backend_url}`)
            }
      }, [backend_url])

      const loadTemplates = async () => {
            // setIsLoading(true);

            try {
                  const url = `${backend_url}/templates`
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

      useEffect(() => {
            if (session) {
                  loadTemplates()
            }
      }, [session])

      

      return <></>
}

export default LoadConfiguration
