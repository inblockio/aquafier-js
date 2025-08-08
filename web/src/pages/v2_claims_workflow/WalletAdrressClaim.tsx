import { forwardRef } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import appStore from '@/store'
import { formatCryptoAddress, generateAvatar, getWalletClaims } from '@/utils/functions'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'

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
      ({ walletAddress, isShortened, avatarOnly }, ref) => {
            const { files, systemFileInfo, setSelectedFileInfo } = useStore(appStore)
            const navigate = useNavigate()

            const handleClick = () => {
                  getWalletClaims(systemFileInfo, files, walletAddress, setSelectedFileInfo, navigate, toast)
            }

            return (
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
                                          <p>{walletAddress}</p>
                                    </TooltipContent>
                              </Tooltip>
                        ) : (
                              <span
                                    className="text-sm cursor-pointer font-mono font-bold break-all"
                                    onClick={handleClick}
                              >
                                    {isShortened ? formatCryptoAddress(walletAddress, 6, 6) : walletAddress}
                              </span>
                        )}
                  </div>
            )
      }
)

WalletAdrressClaim.displayName = 'WalletAdrressClaim'
export default WalletAdrressClaim
