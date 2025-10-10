import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import appStore from '../store'
import { WebConfig } from '@/types/types'
import { ConnectWalletPageMetamask } from './connect_wallet_page_metmask'
import { ConnectWalletPageAppKit } from './connect_wallet_page_appkit'


export const ConnectWalletPage = () => {

  const {
    webConfig,
    setWebConfig
  } = useStore(appStore)

  const [webConfigData, setWebConfigData] = useState<WebConfig | null>(null)

  useEffect(() => {
    if (!webConfigData || webConfig.AUTH_PROVIDER == null || webConfig.BACKEND_URL == null) {
      (async () => {

        const config: WebConfig = await fetch('/config.json').then(res => res.json())

        console.log(`Here ... data ${JSON.stringify(config)}`)
        setWebConfig(config)
        setWebConfigData(config)
      })()
    } else {
      console.log(`Config data ${JSON.stringify(webConfig)}`)
      setWebConfigData(webConfig)
    }
  }, [])


  if (!webConfigData) {
    return <div>Config is empty </div>
  }
  if (webConfigData.AUTH_PROVIDER == "metamask") {
    return <ConnectWalletPageMetamask />
  }
  if (webConfigData.AUTH_PROVIDER == "wallet_connect") {
    return <ConnectWalletPageAppKit />
  }


  return <div>Auth provider Config is unkown : {webConfigData.AUTH_PROVIDER} </div>


}