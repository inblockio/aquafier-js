import {useEffect, useState} from 'react'
import {LuMessageCircleWarning} from 'react-icons/lu'
import {useStore} from 'zustand'
import appStore from '../store'
import apiClient from '@/api/axiosInstance'
import VersionDetails from '../models/VersionDetails'
import {IVersionAndDisclaimer} from '../types/index'
import versionInfo from '../version-info.json'
import {toast} from 'sonner'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from './ui/dialog'
import {Button} from './ui/button'
import {Alert, AlertDescription} from './ui/alert'
import { ensureDomainUrlHasSSL } from '@/utils/functions'

export default function VersionAndDisclaimer({ inline, open, updateOpenStatus }: IVersionAndDisclaimer) {
      //   const {  es, avatar, setAvatar, setUserProfile, backend_url } = useStore(appStore);

      const { backend_url } = useStore(appStore)

      const [isOpen, setIsOpen] = useState(false)
      const [versionDetails, setVersionDetails] = useState<VersionDetails>({
            backend: '1.2.X',
            frontend: '1.2.X',
            aquifier: '1.2.X',
            protocol: '1.2.X',
      })

      const fetchVersionDetails = async () => {
            try {
                  //`${backend_url}/version`
                  const url = ensureDomainUrlHasSSL(`${backend_url}/version`)

                  const response = await apiClient.get(url)

                  const res: VersionDetails = await response.data

                  if (response.status === 200) {
                        setVersionDetails(res)
                  }
            } catch (e: unknown) {
                  toast.error('Error fetching version details')
            }
      }

      useEffect(() => {
            if (!backend_url.includes('0.0.0.0')) {
                  fetchVersionDetails()
            }
      }, [backend_url])

      return (
            <Dialog open={inline ? open : isOpen} onOpenChange={inline ? updateOpenStatus : setIsOpen}>
                  {!inline && (
                        <DialogTrigger asChild>
                              <Button
                                    data-testid="info-button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                          inline ? updateOpenStatus?.(true) : setIsOpen(true)
                                    }}
                              >
                                    <LuMessageCircleWarning className="w-4 h-4 mr-2" />
                                    Info
                              </Button>
                        </DialogTrigger>
                  )}
                  <DialogContent className="max-w-sm rounded-2xl overflow-hidden">
                        <DialogHeader className="py-3 px-5 bg-blue-50/50 dark:bg-gray-800/30">
                              <DialogTitle className="font-medium text-gray-800 dark:text-white">
                                    Product Information
                              </DialogTitle>
                        </DialogHeader>
                        <div className="py-8 px-5">
                              <div className="flex flex-col gap-5 items-center">
                                    <div className="text-center font-medium">Product Version Details</div>
                                    <p className="font-mono text-sm">Protocol Version: {versionDetails.protocol}</p>
                                    <p className="font-mono text-sm">Build Commit Hash: {versionInfo.commitHash}</p>
                                    <p className="font-mono text-sm">Build Date: {versionInfo.buildDate}</p>

                                    <div className="h-8" />

                                    <Alert className="w-full">
                                          <AlertDescription>
                                                This is prototype software, use it with caution.
                                          </AlertDescription>
                                    </Alert>

                                    <p className="text-sm text-center">
                                          This software is developed by{' '}
                                          <a href="https://inblock.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                                                inblock.io
                                          </a>{' '}
                                          assets GmbH
                                    </p>
                                    <p className="text-sm text-center">
                                          The source code can be found:{' '}
                                          <a href="https://github.com/inblockio" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                                                Inblock
                                          </a>
                                    </p>
                                    <Button
                                          data-testid="close-info-button"
                                          onClick={() => {
                                                inline ? updateOpenStatus?.(false) : setIsOpen(false)
                                          }}
                                          className="mt-4"
                                    >
                                          Close
                                    </Button>
                              </div>
                        </div>
                  </DialogContent>
            </Dialog>
      )
}
