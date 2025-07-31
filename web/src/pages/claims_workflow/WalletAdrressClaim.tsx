
import appStore from '@/store'
import { getWalletClaims } from '@/utils/functions'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'

interface IWalletAdrressClaim {
      walletAddress: string
     
}
 
const WalletAdrressClaim = ({ walletAddress }: IWalletAdrressClaim) => {
      const { files, systemFileInfo, setSelectedFileInfo } = useStore(appStore)
      const navigate = useNavigate()

     

      return (
            <>
                  <p className="text-sm" onClick={()=>{
                        getWalletClaims(
                          systemFileInfo    ,
                          files , 
                          walletAddress ,
                          setSelectedFileInfo , 
                          navigate , 
                          toast
                        )
                  }}>
                        {walletAddress}
                  </p>
            </>
      )
}

export default WalletAdrressClaim
