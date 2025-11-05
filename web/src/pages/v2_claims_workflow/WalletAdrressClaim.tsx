import { forwardRef, lazy, Suspense, useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cleanEthAddress, generateAvatar, getWalletClaims } from '@/utils/functions'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import CopyButton from '@/components/CopyButton'
import appStore from '@/store'
import { useStore } from 'zustand'
import { IIdentityClaimDetails } from '@/types/types'
import { ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiFileInfo } from '@/models/FileInfo'
import { toast } from 'sonner'
import { API_ENDPOINTS, IDENTITY_CLAIMS } from '@/utils/constants'
import axios from 'axios'
const WalletAddressProfile = lazy(() => import('./WalletAddressProfile'))

interface IWalletAdrressClaim {
      walletAddress: string
      isShortened?: boolean
      avatarOnly?: boolean
}

const getInitials = (name: string) => {
      return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
}

const WalletAdrressClaim = forwardRef<HTMLDivElement, IWalletAdrressClaim>(
      ({ walletAddress, avatarOnly }, ref) => {

            const [identityClaimDetails, setIdentityClaimDetails] = useState<IIdentityClaimDetails | null>(null)
            const [showWalletAddress, setShowWalletAddress] = useState(false)
            const [files, setFiles] = useState<Array<ApiFileInfo>>([])
            const [isLoading, setIsLoading] = useState(true)

            const { setSelectedFileInfo, session, backend_url } = useStore(appStore)

            const [open, setOpen] = useState(false)

            const handleClick = () => {
                  setOpen(true)
            }

            const loadSystemAquaFileNames = async () => {
                  if (!session?.nonce) return []
                  try {
                        const response = await axios.get(`${backend_url}/${API_ENDPOINTS.SYSTEM_AQUA_FILES_NAMES}`, {
                              headers: {
                                    'nonce': session.nonce,
                                    'metamask_address': session.address
                              }
                        })
                        // setSystemAquaFileNames(response.data.data)
                        return response.data.data
                  } catch (error) {
                        console.log("Error getting system aqua file names", error)
                        return []
                  }
            }

            async function loadClaimsFileData() {
                  setFiles([])
                  let isGood = cleanEthAddress(walletAddress)
                  if (!isGood) {
                        toast.warning("Invalid wallet address", {
                              position: "top-center"
                        })
                        return
                  }

                  setIsLoading(true);
                  try {
                        const params = {
                              page: 1,
                              limit: 100,
                              claim_types: JSON.stringify(IDENTITY_CLAIMS),
                              wallet_address: walletAddress,
                              use_wallet: session?.address,
                        }
                        const filesDataQuery = await axios.get(`${backend_url}/${API_ENDPOINTS.GET_PER_TYPE}`, {
                              headers: {
                                    'Content-Type': 'application/json',
                                    'nonce': `${session!.nonce}`
                              },
                              params
                        })
                        const response = filesDataQuery.data
                        const aquaTrees = response.aquaTrees
                        const aquaTemplateNames = await loadSystemAquaFileNames()
                        // setPagination(response.pagination)
                        setFiles(aquaTrees)
                        const identityClaimDetails = getWalletClaims(aquaTemplateNames, aquaTrees, walletAddress, setSelectedFileInfo)
                        setIdentityClaimDetails(identityClaimDetails)
                        // Process claims after setting files
                        // await processAllAddressClaims(aquaTrees)
                  } catch (error) {
                        console.error('Error loading claims:', error);
                        toast.error('Failed to load claims');
                        // setIsProcessingClaims(false)
                  } finally {
                        setIsLoading(false);
                        // setIsProcessingClaims(false)
                  }
            }

            useEffect(() => {
                  if (session) {
                        loadClaimsFileData()
                  }
            }, [walletAddress, session?.nonce])

            return (
                  <>
                        <HoverCard open={open} onOpenChange={setOpen}>
                              <HoverCardTrigger>
                                    <div className="inline-block w-full" ref={ref}>
                                          {avatarOnly ? (
                                                <Tooltip>
                                                      <TooltipTrigger asChild>
                                                            <Avatar
                                                                  className="h-8 w-8 border-2 rounded-full border-blue-500 cursor-pointer"
                                                                  onClick={handleClick}
                                                            >
                                                                  <AvatarImage src={generateAvatar(walletAddress)} alt="Avatar" />
                                                                  <AvatarFallback className="text-xs">{getInitials(walletAddress)}</AvatarFallback>
                                                            </Avatar>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                            <div className="flex gap-0 items-center">
                                                                  <p className='text-sm'>{showWalletAddress ? walletAddress : identityClaimDetails?.name || walletAddress}</p>
                                                                  <CopyButton text={`${walletAddress}`} isIcon={true} />
                                                                  {identityClaimDetails ? (
                                                                        <Button size={"icon-sm"} variant={"outline"} className='cursor-pointer' onClick={(e) => {
                                                                              e.stopPropagation()
                                                                              setShowWalletAddress(prev => !prev)
                                                                        }}>
                                                                              <ArrowRightLeft size={16} />
                                                                        </Button>
                                                                  ) : null}
                                                            </div>
                                                      </TooltipContent>
                                                </Tooltip>
                                          ) : (
                                                <div className="p-0 flex gap-2 items-center flex-wrap break-all">
                                                      <CopyButton text={`${walletAddress}`} isIcon={true} />
                                                      {identityClaimDetails ? (
                                                            <Button size={"icon-sm"} variant={"outline"} className='cursor-pointer' onClick={(e) => {
                                                                  e.stopPropagation()
                                                                  e.preventDefault()
                                                                  setShowWalletAddress(prev => !prev)
                                                            }}>
                                                                  <ArrowRightLeft size={16} />
                                                            </Button>
                                                      ) : null}
                                                      <p
                                                            className="p-0 text-xs flex-1 cursor-pointer font-mono font-medium"
                                                            style={{
                                                                  wordBreak: "break-all",
                                                                  wordWrap: "break-word",
                                                                  textWrap: "wrap"
                                                            }}
                                                            onClick={(e) => {
                                                                  e.preventDefault()
                                                                  e.stopPropagation()
                                                                  handleClick()
                                                            }}
                                                      >
                                                            {isLoading ? "Loading...": null}
                                                            {showWalletAddress ? walletAddress : identityClaimDetails?.name || walletAddress}
                                                      </p>
                                                </div>
                                          )}
                                    </div>
                              </HoverCardTrigger>
                              <HoverCardContent className='w-[350px] p-0 overflow-hidden' align='start'>
                                    <Suspense fallback={<p className='p-6'>Loading...</p>}>
                                          <WalletAddressProfile walletAddress={walletAddress} showShadow={false} noBg={true} files={files} />
                                    </Suspense>
                              </HoverCardContent>
                        </HoverCard>
                  </>
            )
      }
)

WalletAdrressClaim.displayName = 'WalletAdrressClaim'
export default WalletAdrressClaim
