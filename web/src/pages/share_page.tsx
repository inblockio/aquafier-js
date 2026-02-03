import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from 'zustand'
import appStore from '../store'
import axios from 'axios'
import { ApiFileInfo } from '../models/FileInfo'
// import { ClipLoader } from "react-spinners";
import { IDrawerStatus } from '../models/AquaTreeDetails'
import { ImportAquaChainFromChain } from '../components/dropzone_file_actions/import_aqua_tree_from_aqua_tree'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { CompleteChainView } from '../components/files_chain_details'
import { ensureDomainUrlHasSSL } from '@/utils/functions'

const SharePage = () => {  
      const { backend_url, metamaskAddress, session } = useStore(appStore)
      const [fileInfo, setFileInfo] = useState<ApiFileInfo | null>(null)
      const [contractData, setContractData] = useState<any | null>(null)
      const [loading, setLoading] = useState(false)
      const [hasError, setHasError] = useState<string | null>(null)
      const [drawerStatus, setDrawerStatus] = useState<IDrawerStatus | null>(null)

      const params = useParams()
      const identifier = useMemo(() => {
            return params.identifier
      }, [params])

      const loadPageData = async () => {
            if (loading) {
                  toast.warning('Already loading, skipping new request')
                  return
            }
            if (!session?.nonce || !params?.identifier) {
                  console.log('Missing session nonce or identifier:', { nonce: session?.nonce, identifier: params?.identifier })
                  return
            }
            if (backend_url.includes('0.0.0.0')) {
                  console.log('Backend URL contains 0.0.0.0, skipping fetch')
                  return
            }

            setLoading(true)
            setHasError(null)

            try {
                  const url = ensureDomainUrlHasSSL(`${backend_url}/share_data/${params.identifier}`)
                  const response = await axios.get(url, {
                        headers: {
                              'Content-Type': 'application/x-www-form-urlencoded',
                              nonce: session?.nonce ?? '',
                        },
                  })

                  if (response.status === 200) {
                        setFileInfo(response.data.data.displayData[0])
                        setContractData(response.data.data.contractData)
                  }
            } catch (error: any) {
                  console.error('Error fetching share data:', error)

                  if (error.response?.status === 401) {
                        setHasError('Unauthorized. Please log in again.')
                  } else if (error.response?.status === 404) {
                        setHasError('File could not be found (probably it was deleted)')
                  } else if (error.response?.status === 412) {
                        setHasError('File not found or no permission for access granted.')
                  } else {
                        setHasError(`Error: ${error.message || error}`)
                  }

                  toast.error('Error fetching data')
            } finally {
                  setLoading(false)
            }
      }

      useEffect(() => {
            if (params.identifier && session?.nonce) {
                  loadPageData()
            }
      }, [session, identifier, backend_url])

      const showProperWidget = () => {
            if (hasError) {
                  return (
                        <div className="flex justify-center items-center">
                              <Alert variant="destructive" className="w-auto">
                                    <AlertDescription>{hasError}</AlertDescription>
                              </Alert>
                        </div>
                  )
            }
            return <div />
      }

      const updateDrawerStatus = (_drawerStatus: IDrawerStatus) => {
            setDrawerStatus(_drawerStatus)
      }

      return (
            <div id="replace-here" className="container w-10xl mx-auto">
                  <div className="w-full py-4">
                        {!session ? (
                              <div className="flex justify-center items-center">
                                    <Alert className="w-auto">
                                          <AlertTitle>Login Required</AlertTitle>
                                          <AlertDescription>You need to be logged in to view this file!</AlertDescription>
                                    </Alert>
                              </div>
                        ) : null}
                        {showProperWidget()}
                        {loading ? (
                              <div className="flex justify-center items-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <span className="ml-3">Loading shared file...</span>
                              </div>
                        ) : null}
                        {!loading && !hasError && !fileInfo && session ? (
                              <div className="flex justify-center items-center">
                                    <Alert className="w-auto">
                                          <AlertDescription>No file data available. Please check the share link.</AlertDescription>
                                    </Alert>
                              </div>
                        ) : null}
                        {fileInfo ? (
                              <div className="w-full mt-10">
                                    <div className="flex flex-col space-y-10">
                                          <div className="flex justify-center w-full">
                                                {!metamaskAddress ? (
                                                      <div></div>
                                                ) : drawerStatus ? (
                                                      <ImportAquaChainFromChain
                                                            showButtonOnly={false}
                                                            fileInfo={fileInfo}
                                                            contractData={contractData}
                                                            isVerificationSuccessful={drawerStatus ? drawerStatus?.isVerificationSuccessful : false}
                                                      />
                                                ) : (
                                                      <div className="w-full max-w-md">
                                                            <Alert>
                                                                  <AlertDescription>Waiting for Aqua tree verification to complete</AlertDescription>
                                                            </Alert>
                                                      </div>
                                                )}
                                          </div>
                                          <div className="w-full">
                                                <CompleteChainView callBack={updateDrawerStatus} selectedFileInfo={fileInfo} />
                                          </div>
                                    </div>
                              </div>
                        ) : null}
                  </div>
            </div>
      )
}

export default SharePage
