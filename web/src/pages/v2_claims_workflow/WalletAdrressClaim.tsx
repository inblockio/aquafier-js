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

            const { files, systemFileInfo, setSelectedFileInfo } = useStore(appStore)
            // const navigate = useNavigate()
            const [open, setOpen] = useState(false)

            const handleClick = () => {
                  setOpen(true)
            }

            useEffect(() => {
                  const identityClaimDetails = getWalletClaims(systemFileInfo, files.fileData, walletAddress, setSelectedFileInfo)
                  setIdentityClaimDetails(identityClaimDetails)
            }, [walletAddress])

            return (
                  <>
                        <HoverCard open={open} onOpenChange={setOpen}>
                              <HoverCardTrigger>
                                    <div className="inline-block" ref={ref}>
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
                                                            <span className="flex gap-0 items-center">
                                                                  <p className='text-sm'>{showWalletAddress ? walletAddress : identityClaimDetails?.name || walletAddress}</p>
                                                                  <CopyButton text={`${walletAddress}`} isIcon={true} />
                                                                  {identityClaimDetails && <ArrowRightLeft size={16} onClick={() => setShowWalletAddress(prev => !prev)} />}
                                                            </span>
                                                      </TooltipContent>
                                                </Tooltip>
                                          ) : (
                                                <span className="flex gap-2 items-center">
                                                      <span
                                                            className="text-sm cursor-pointer font-mono font-bold break-all"
                                                            onClick={(e) => {
                                                                  e.stopPropagation()
                                                                  handleClick()
                                                            }}
                                                      >
                                                            {showWalletAddress ? walletAddress : identityClaimDetails?.name || walletAddress}
                                                      </span>
                                                      <CopyButton text={`${walletAddress}`} isIcon={true} />
                                                      {identityClaimDetails && <ArrowRightLeft size={16} onClick={() => setShowWalletAddress(prev => !prev)} />}
                                                </span>
                                          )}
                                    </div>
                              </HoverCardTrigger>
                              <HoverCardContent className='w-[350px] p-0'>
                                    <Suspense fallback={<p className='p-6'>Loading...</p>}>
                                          <WalletAddressProfile walletAddress={walletAddress} showShadow={false} noBg={true} />
                                    </Suspense>
                              </HoverCardContent>
                        </HoverCard>
                  </>
            )
      }
)

WalletAdrressClaim.displayName = 'WalletAdrressClaim'
export default WalletAdrressClaim
