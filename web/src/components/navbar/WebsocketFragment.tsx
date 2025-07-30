import { useStore } from 'zustand'
import appStore from '../../store'
import { convertToWebsocketUrl, ensureDomainUrlHasSSL, fetchFiles, getGenesisHash } from '../../utils/functions'
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
// import { toaster } from "../chakra-ui/toaster";
import { WebSocketMessage } from '../../types/types'
import WebSocketActions from '../../constants/constants'
import { toaster } from '../ui/use-toast'

// Add these at the component level (outside the component if using class)
let pingInterval: NodeJS.Timeout | null = null
let isExplicitDisconnect = false
let activeReconnectTimeout: NodeJS.Timeout | null = null
const MAX_RECONNECT_ATTEMPTS = 10 // Maximum number of reconnection attempts
const RECONNECT_BASE_DELAY = 1000 // 1 second base delay
const RECONNECT_MAX_DELAY = 30000 // 30 seconds maximum delay

const WebsocketFragment = () => {
      const { backend_url, session, setFiles, setSelectedFileInfo, selectedFileInfo, setContracts } = useStore(appStore)
      const [localSession, setLocalSession] = useState(session)

      const [ws, setWs] = useState<WebSocket | null>(null)
      const [isConnected, setIsConnected] = useState(false)
      const [websocketReconnectAttempts, setWebsocketReconnectAttempts] = useState(0)

      // const [_connectedUsers, setConnectedUsers] = useState<string[]>([]);
      const selectedFileRef = useRef(selectedFileInfo)
      const nounceRef = useRef(session?.nonce ?? '')
      const walletAddressRef = useRef(session?.address ?? '')
      const backendUrlRef = useRef(backend_url)
      // let pingInterval: NodeJS.Timeout | null = null;

      // Fetch connected users from server
      const fetchConnectedUsers = async () => {
            try {
                  // Step 1: Ensure SSL if needed
                  const validHttpAndDomain = ensureDomainUrlHasSSL(backend_url)
                  const response = await axios.get(`${validHttpAndDomain}/ws/clients`)
                  const users = response.data.clients.map((client: any) => client.userId)
                  console.log(`Users ${users} ..`)
                  // setConnectedUsers(users);
            } catch (error) {
                  console.error('Error fetching connected users:', error)
            }
      }

      const checkServerStatus = async () => {
            try {
                  const response = await axios.get(`${backend_url}`)
                  if (response.status === 200) {
                        return true
                  }
                  return false
            } catch (error) {
                  console.error('Error checking server status:', error)
                  return false
            }
      }

      const connectWebsocket = () => {
            // Cancel any pending reconnection if we're explicitly connecting
            if (activeReconnectTimeout) {
                  clearTimeout(activeReconnectTimeout)
                  activeReconnectTimeout = null
            }

            const userId = session!.address!
            const WS_URL = `${convertToWebsocketUrl(backend_url)}/ws`

            // Update your reconnectWithBackoff function
            const reconnectWithBackoff = (reason: string) => {
                  console.log('Connection Reason: ', reason)

                  // Don't reconnect if we explicitly disconnected or reached max attempts
                  if (isExplicitDisconnect) {
                        // console.log("Not reconnecting - explicit disconnect");
                        return
                  }

                  // Get the current reconnection attempt count
                  const attemptCount = websocketReconnectAttempts

                  // Stop if we've reached maximum attempts
                  if (attemptCount >= MAX_RECONNECT_ATTEMPTS) {
                        // console.log(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
                        toaster.create({
                              description: 'Could not reconnect to server. Please refresh the page.',
                              type: 'error',
                        })
                        return
                  }

                  // Calculate delay with exponential backoff
                  const delay = Math.min(Math.pow(2, attemptCount) * RECONNECT_BASE_DELAY, RECONNECT_MAX_DELAY)

                  // console.log(`Scheduling reconnection attempt ${attemptCount + 1} in ${delay}ms`);

                  // Increment the reconnection attempt counter
                  setWebsocketReconnectAttempts(prev => prev + 1)

                  // Clear any existing timeout before setting a new one
                  if (activeReconnectTimeout) {
                        clearTimeout(activeReconnectTimeout)
                  }

                  // Set new reconnection timeout
                  activeReconnectTimeout = setTimeout(() => {
                        // console.log(`Attempting reconnection #${attemptCount + 1}`);
                        activeReconnectTimeout = null
                        connectWebsocket()
                  }, delay)
            }

            try {
                  const websocket = new WebSocket(`${WS_URL}?userId=${encodeURIComponent(userId)}`)

                  websocket.onopen = () => {
                        console.log(`Connected to WebSocket as user: ${userId}`)
                        setIsConnected(true)
                        setWs(websocket)
                        setWebsocketReconnectAttempts(0)

                        // Clear any existing ping interval
                        if (pingInterval) {
                              clearInterval(pingInterval)
                        }

                        // Set up new ping interval
                        pingInterval = setInterval(() => {
                              if (websocket.readyState === WebSocket.OPEN) {
                                    websocket.send(JSON.stringify({ action: 'ping', type: 'ping' }))
                              }
                        }, 20000)
                  }

                  websocket.onmessage = event => {
                        try {
                              const message: WebSocketMessage = JSON.parse(event.data)

                              // console.log(`🔌 ECHO - message received ${message.action}`)
                              if (message.action === WebSocketActions.REFETCH_FILES) {
                                    ;(async () => {
                                          if (walletAddressRef.current && nounceRef.current) {
                                                // console.log(`🔌 ECHO - message  fetching data`)

                                                const url = `${backend_url}/explorer_files`
                                                const actualUrlToFetch = ensureDomainUrlHasSSL(url)
                                                const files = await fetchFiles(walletAddressRef.current, actualUrlToFetch, nounceRef.current)
                                                setFiles(files)
                                                // if(selectedFileInfo){
                                                //     const genesisHash = getGenesisHash(selectedFileInfo.aquaTree!)
                                                // }

                                                // Use the ref to get the current value
                                                const currentSelectedFile = selectedFileRef.current

                                                if (currentSelectedFile) {
                                                      // if (userSelectedFile) {
                                                      const genesisHash = getGenesisHash(currentSelectedFile!.aquaTree!)
                                                      if (genesisHash) {
                                                            for (const itemTree of files) {
                                                                  const genesisHashItem = getGenesisHash(itemTree.aquaTree!)
                                                                  if (genesisHashItem) {
                                                                        if (genesisHashItem == genesisHash) {
                                                                              setSelectedFileInfo(itemTree)
                                                                              break
                                                                        }
                                                                  }
                                                            }
                                                      } else {
                                                            console.log(`🔌 - Genesis hash not found for selected file`)
                                                      }
                                                } else {
                                                      // console.log(`🔌 -1- No selected file ${userSelectedFile}`)
                                                      // console.log(`🔌 -2- No selected file ${selectedFileInfo}`)
                                                      console.log(`🔌 -3- No selected file ${currentSelectedFile}`)
                                                }
                                          } else {
                                                console.log(`🔌 - Cannot refetch files as session or address or nounce is not defined DEBUG : ${JSON.stringify(session ?? {})}  `)
                                          }
                                    })()
                              } else if (message.action === WebSocketActions.REFETCH_SHARE_CONTRACTS) {
                                    ;(async () => {
                                          try {
                                                const url = `${backend_url}/contracts`
                                                const response = await axios.get(url, {
                                                      params: {
                                                            receiver: session?.address, // walletAddressRef.current
                                                      },
                                                      headers: {
                                                            nonce: session?.nonce, // nounceRef.current
                                                      },
                                                })
                                                if (response.status === 200) {
                                                      setContracts(response.data?.contracts)
                                                }

                                                toaster.create({
                                                      description: `An item was shared to your account`,
                                                      type: 'success',
                                                })
                                          } catch (e) {
                                                console.log('Error loadin cntract')
                                          }
                                    })()
                              } else if (message.action === WebSocketActions.FETCH_USERS) {
                                    fetchConnectedUsers()
                              } else {
                                    // console.log(`🔌 ECHO - message received ${JSON.stringify(message, null, 4)}`)
                              }
                        } catch (error) {
                              console.error('Error parsing WebSocket message:', error)
                              // Handle non-JSON messages
                              // const message: WebSocketMessage = {
                              //     type: 'raw',
                              //     data: event.data,
                              //     timestamp: new Date().toISOString()
                              // };
                              // console.log(`Raw message ${JSON.stringify(message)}`)
                              // setMessages(prev => [...prev, message]);
                        }
                  }

                  websocket.onclose = async event => {
                        console.log('Disconnected from WebSocket:', event, isExplicitDisconnect)
                        setIsConnected(false)
                        setWs(null)

                        if (pingInterval) {
                              clearInterval(pingInterval)
                              pingInterval = null
                        }
                        console.log(`🔌 - Disconnected from WebSocket as user: ${isExplicitDisconnect}`)
                        // Only show error if not an explicit disconnect
                        // if (!isExplicitDisconnect) {
                        //     // toaster.create({
                        //     //     description: `Realtime connection disconnected: ${event.reason || 'No reason provided'}`,
                        //     //     type: "error"
                        //     // });
                        //     const serverStatus = await checkServerStatus()
                        //     if (serverStatus) {
                        //         reconnectWithBackoff('connection closed');
                        //     }
                        // }
                        if (event.wasClean && event.code === 1005) {
                              // toaster.create({
                              //     description: `Realtime connection disconnected: ${event.reason || 'No reason provided'}`,
                              //     type: "error"
                              // });
                              const serverStatus = await checkServerStatus()
                              if (serverStatus) {
                                    reconnectWithBackoff('connection closed')
                              }
                        }

                        if (event.reason === 'New connection established') {
                              connectWebsocket()
                        }
                  }

                  websocket.onerror = error => {
                        console.error('WebSocket error:', error)
                        setIsConnected(false)

                        if (pingInterval) {
                              clearInterval(pingInterval)
                              pingInterval = null
                        }

                        if (!isExplicitDisconnect) {
                              toaster.create({
                                    description: `Realtime connection error occurred`,
                                    type: 'error',
                              })

                              // The onclose handler will trigger reconnection
                        }
                  }
            } catch (error) {
                  console.error('Failed to connect to WebSocket:', error)
                  if (!isExplicitDisconnect) {
                        toaster.create({
                              description: `Failed to establish realtime connection`,
                              type: 'error',
                        })
                        reconnectWithBackoff('connection error')
                  }
            }
      }

      // Disconnect WebSocket
      const disconnectWebSocket = () => {
            isExplicitDisconnect = true

            if (ws) {
                  ws.close()
                  setWs(null)
                  setIsConnected(false)
            }

            if (pingInterval) {
                  clearInterval(pingInterval)
                  pingInterval = null
            }

            if (activeReconnectTimeout) {
                  clearTimeout(activeReconnectTimeout)
                  activeReconnectTimeout = null
            }
      }

      useEffect(() => {
            if (!isConnected && session) {
                  isExplicitDisconnect = false // Reset flag when attempting new connection
                  connectWebsocket()
            }
            if (session != null && session.nonce != undefined && backend_url != 'http://0.0.0.0:0') {
                  backendUrlRef.current = backend_url
                  nounceRef.current = session.nonce
                  walletAddressRef.current = session.address
            }
            // return () => {
            //     disconnectWebSocket();
            // };
      }, [backend_url, session])

      useEffect(() => {
            selectedFileRef.current = selectedFileInfo
      }, [selectedFileInfo])

      // Add cleanup in useEffect
      useEffect(() => {
            if (session != null && session.nonce != undefined && backend_url != 'http://0.0.0.0:0') {
                  backendUrlRef.current = backend_url
                  nounceRef.current = session.nonce
                  walletAddressRef.current = session.address
                  // loadTemplates();
                  // loadTemplatesAquaTrees();
            }

            // Cleanup function
      }, [])

      useEffect(() => {
            if (!localSession) {
                  disconnectWebSocket()
            }
            // Cleanup function
      }, [localSession])

      useEffect(() => {
            setLocalSession(session)
      }, [session])

      return <></>
}

export default WebsocketFragment
