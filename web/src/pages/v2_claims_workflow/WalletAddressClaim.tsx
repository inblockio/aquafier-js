import { forwardRef, lazy, Suspense, useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { generateAvatar, getWalletClaims } from '@/utils/functions'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import CopyButton from '@/components/CopyButton'
import appStore from '@/store'
import { useStore } from 'zustand'
import { IIdentityClaimDetails } from '@/types/types'
import { ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiFileInfo } from '@/models/FileInfo'
import { toast } from 'sonner'
import { AquaSystemNamesService } from '@/storage/databases/aquaSystemNames'
const WalletAddressProfile = lazy(() => import('./WalletAddressProfile'))

interface IWalletAddressClaim {
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

const WalletAddressClaim = forwardRef<HTMLDivElement, IWalletAddressClaim>(
      ({ walletAddress, avatarOnly }, ref) => {

            const [identityClaimDetails, setIdentityClaimDetails] = useState<IIdentityClaimDetails | null>(null)
            const [showWalletAddress, setShowWalletAddress] = useState(false)
            const [files, setFiles] = useState<Array<ApiFileInfo>>([])
            const [isLoading, setIsLoading] = useState(true)

            const { setSelectedFileInfo, session } = useStore(appStore)

            const [open, setOpen] = useState(false)

            const handleClick = () => {
                  setOpen(true)
            }

            const loadSystemAquaFileNames = async () => {
                  const aquaSystemNamesService = AquaSystemNamesService.getInstance();
                  const systemNames = await aquaSystemNamesService.getSystemNames();
                  return systemNames;
            }

            async function loadClaimsFileData() {
                  setFiles([])
                  setIsLoading(true);
                  try {
                        let aquaTrees: ApiFileInfo[] = [];
                        const aquaTemplateNames = await loadSystemAquaFileNames();

                        // Check if files are passed as props first, then fallback to ContactsDB
                        // Load contact profile from IndexedDB
                        const { ContactsService } = await import('@/storage/databases/contactsDb');
                        const contactsService = ContactsService.getInstance();
                        const contactProfile = await contactsService.getContactByAddress(walletAddress);

                        if (contactProfile && contactProfile.files) {
                              aquaTrees = contactProfile.files;
                        }
                        setFiles(aquaTrees)
                        const identityClaimDetails = getWalletClaims(aquaTemplateNames, aquaTrees, walletAddress, setSelectedFileInfo)
                        setIdentityClaimDetails(identityClaimDetails)
                  } catch (error) {
                        console.error('Error loading claims:', error);
                        toast.error('Failed to load claims');
                  } finally {
                        setIsLoading(false);
                  }
            }

            useEffect(() => {
                  if (session) {
                        loadClaimsFileData()
                  } else {
                        console.warn('No active session found. Cannot load claims data.');
                        setIsLoading(false)
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
                                                            {isLoading ? "Loading..." : (
                                                                  <>{showWalletAddress ? walletAddress : identityClaimDetails?.name || walletAddress}</>
                                                            )}
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

WalletAddressClaim.displayName = 'WalletAddressClaim'
export default WalletAddressClaim
