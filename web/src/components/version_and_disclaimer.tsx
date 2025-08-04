import { useEffect, useState } from 'react'
// import { Button } from "./chakra-ui/button";
// import { DialogBody, DialogCloseTrigger, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./chakra-ui/dialog";
import { Center, Link, Spacer, Text, VStack } from '@chakra-ui/react'
import { LuMessageCircleWarning } from 'react-icons/lu'
import { useStore } from 'zustand'
import appStore from '../store'
// import { Alert } from "./chakra-ui/alert";
import axios from 'axios'
// import { toaster } from "./chakra-ui/toaster";
import VersionDetails from '../models/VersionDetails'
import { IVersionAndDisclaimer } from '../types/index'
import versionInfo from '../version-info.json'
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogCloseTrigger } from '@chakra-ui/react'
import { Button } from './ui/button'
import { Alert } from './ui/alert'
import { toast } from 'sonner'

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
                  const url = `${backend_url}/version`

                  const response = await axios.get(url)

                  const res: VersionDetails = await response.data

                  if (response.status === 200) {
                        setVersionDetails(res)
                  }
            } catch (e: unknown) {
                  //  console.log("Error fetching version ", e)
                  toast.error( 'Error fetching version details')
            }
      }

      useEffect(() => {
            if (!backend_url.includes('0.0.0.0')) {
                  fetchVersionDetails()
            }
      }, [backend_url])

      return (
            <Dialog.Root placement={'center'} size={'sm'} open={inline ? open : isOpen} onOpenChange={details => setIsOpen(details.open)}>
                  <DialogTrigger asChild>
                        <Button
                              data-testid="info-button"
                              // colorPalette={'black'}
                              size={'sm'}
                              // borderRadius={"md"}
                              onClick={() => {
                                    inline ? updateOpenStatus?.(true) : setIsOpen(true)
                                    // !metamaskAddress && signAndConnect();
                              }}
                              hidden={inline}
                        >
                              <LuMessageCircleWarning />
                              Info
                        </Button>
                  </DialogTrigger>
                  {/* <DialogContent borderRadius={"2xl"} overflow={"hidden"}> */}
                  <DialogContent>
                        {/* <DialogHeader py={"3"} px={"5"} bg={{ base: "rgb(188 220 255 / 22%)", _dark: "rgba(0, 0, 0, 0.3)" }}> */}
                        <DialogHeader>
                              {/* <DialogTitle fon/tWeight={500} color={"gray.800"} _dark={{ color: "white" }}> */}
                              <DialogTitle>Product Infomation</DialogTitle>
                        </DialogHeader>
                        <DialogBody py={'8'} px={'5'}>
                              <VStack gap={5}>
                                    <Center>Product Verion Details</Center>
                                    {/* <Text fontFamily={"monospace"}>aquafier Version : {versionDetails.aquifier}  </Text> */}
                                    <Text fontFamily={'monospace'}>Protocol Version : {versionDetails.protocol} </Text>
                                    <Text fontFamily={'monospace'}>Build Commit Hash : {versionInfo.commitHash} </Text>
                                    <Text fontFamily={'monospace'}>Build Date: {versionInfo.buildDate} </Text>

                                    <Spacer height={30} />

                                    {/* <Alert status="error" title="" variant="solid"   > */}
                                    <Alert>This is prototype software,use it with caution.</Alert>

                                    <Text>
                                          This software is developed by{' '}
                                          <Link href="https://inblock.io/" target="_blank" style={{ color: 'blue' }}>
                                                inblock.io
                                          </Link>{' '}
                                          assets GmbH <br />{' '}
                                    </Text>
                                    <Text>
                                          The source code can be found:{' '}
                                          <Link href="https://github.com/inblockio" target="_blank" style={{ color: 'blue' }}>
                                                Inblock
                                          </Link>
                                    </Text>
                                    {/* <Button data-testid="close-info-button" borderRadius={"md"} onClick={() => { */}
                                    <Button
                                          data-testid="close-info-button"
                                          onClick={() => {
                                                inline ? updateOpenStatus?.(false) : setIsOpen(false)
                                          }}
                                    >
                                          close
                                          {/* <LuClose /> */}
                                    </Button>
                              </VStack>
                        </DialogBody>
                        <DialogCloseTrigger
                              onClick={() => {
                                    inline ? updateOpenStatus?.(false) : setIsOpen(false)
                              }}
                        />
                  </DialogContent>
            </Dialog.Root>
      )
}
