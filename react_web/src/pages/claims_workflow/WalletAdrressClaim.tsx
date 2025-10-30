
import appStore from '@/store'
import { getWalletClaims } from '@/utils/functions'
import { useStore } from 'zustand'

interface IWalletAdrressClaim {
      walletAddress: string
     
}
 
const WalletAdrressClaim = ({ walletAddress }: IWalletAdrressClaim) => {
      const { files, systemFileInfo, setSelectedFileInfo } = useStore(appStore)

     

      return (
            <>
                  <p className="text-sm" onClick={()=>{
                        getWalletClaims(
                          systemFileInfo    ,
                          files.fileData , 
                          walletAddress ,
                          setSelectedFileInfo ,
                        )
                  }}>
                        {walletAddress}
                  </p>
            </>
      )
}

export default WalletAdrressClaim
