import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import appStore from '../../store'
import { WebConfig } from '@/types/types'
import { ConnectWalletPageMetamask } from './connect_wallet_page_metmask'
import { ConnectWalletPageAppKit } from './connect_wallet_page_appkit'


export const ConnectWalletPage = () => {

  const {
    webConfig,
    setWebConfig
  } = useStore(appStore)

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const loadConfig = async () => {
      // Only load if config is not already loaded
      if (!webConfig.AUTH_PROVIDER || !webConfig.BACKEND_URL) {
        setIsLoading(true)
        try {
          const config: WebConfig = await fetch('/config.json', { signal: controller.signal }).then(res => res.json())
          setWebConfig(config)
        } catch (error) {
          if (!controller.signal.aborted) {
            console.error('Failed to load config:', error)
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false)
          }
        }
      }
    }

    loadConfig()
    return () => controller.abort()
  }, [webConfig.AUTH_PROVIDER, webConfig.BACKEND_URL, setWebConfig])

  if (isLoading || !webConfig.AUTH_PROVIDER) {
    return <div>Loading...</div>
  }

  if (webConfig.AUTH_PROVIDER === "metamask") {
    return <ConnectWalletPageMetamask />
  }
  
  if (webConfig.AUTH_PROVIDER === "wallet_connect") {
    return <ConnectWalletPageAppKit />
  }

  return <div>Auth provider Config is unknown: {webConfig.AUTH_PROVIDER}</div>

}