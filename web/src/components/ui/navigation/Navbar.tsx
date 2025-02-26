import { Box, HStack, Image } from "@chakra-ui/react"
import Settings from "../settings"
import ConnectWallet from "./ConnectWallet"
import { useColorMode } from "../color-mode"
import appStore from "../../../store"
import { useStore } from "zustand"
import VersionAndDisclaimer from "./VersionAndDisclaimer"
import { Link } from "react-router-dom"


const Navbar = () => {
    const { colorMode } = useColorMode()
    const { metamaskAddress } = useStore(appStore)

    return (
        <div>
            <Box bg={{ base: 'rgb(188 220 255 / 22%)', _dark: 'rgba(0, 0, 0, 0.3)' }} h={'70px'}>
                <HStack h={'100%'} px={"4"} justifyContent={'space-between'}>
                    <Link to={'/'} style={{ height: "100%", display: "flex", alignItems: "center" }}>
                        <Image src={colorMode === 'light' ? "/images/logo.png" : "/images/logo-dark.png"} maxH={'60%'} />
                    </Link>
                    <HStack h={'100%'} justifyContent={'space-between'}>
                        <VersionAndDisclaimer />
                        <ConnectWallet />
                        {
                            metamaskAddress ? (
                                <Settings />
                            ) : null
                        }
                    </HStack>
                </HStack>
            </Box>
        </div>
    )
}

export default Navbar