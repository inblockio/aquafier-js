import { Box, Group, HStack, Image, LinkBox, Text } from "@chakra-ui/react"
import Settings from "./chakra-ui/settings"
import ConnectWallet from "./ConnectWallet"
import { useColorMode } from "./chakra-ui/color-mode"
import appStore from "../store"
import { useStore } from "zustand"
import VersionAndDisclaimer from "./VersionAndDisclaimer"
import { Link } from "react-router-dom"
import AccountContracts from "./AccountContracts"
import { ReactNode } from "react"

interface INavlinkItem {
    label: string
    to: string
    icon?: ReactNode
}

const navlinks: INavlinkItem[] = [
    // {
    //     label: "Forms",
    //     to: "/aqua-forms"
    // },
    // {
    //     label: "Form Generator",
    //     to: "/form-generator"
    // }
]

const CustomNavlinkItem = ({ label, to }: INavlinkItem) => {

    
    return (
        <Link to={to}>
            <LinkBox>
                <Text>{label}</Text>
            </LinkBox>
        </Link>
    )
}


const Navbar = () => {
    const { colorMode } = useColorMode()
    const { session } = useStore(appStore)

    return (
        <div>
            <Box bg={{ base: 'rgb(188 220 255 / 22%)', _dark: 'rgba(0, 0, 0, 0.3)' }} h={'70px'}>
                <HStack h={'100%'} px={"4"} justifyContent={'space-between'}>
                    <Link to={'/'} style={{ height: "100%", display: "flex", alignItems: "center" }}>
                        <Image src={colorMode === 'light' ? "/images/logo.png" : "/images/logo-dark.png"} maxH={'60%'} />
                    </Link>
                    <Group>
                        {
                            navlinks.map((item, i: number) => (
                                <CustomNavlinkItem key={`navitem_${i}`} {...item} />
                            ))
                        }
                    </Group>
                    <HStack h={'100%'} justifyContent={'space-between'}>
                        <VersionAndDisclaimer />
                        <ConnectWallet />
                        {
                            session ? (<>
                                <AccountContracts />
                                <Settings />
                            </>
                            ) : null
                        }
                    </HStack>
                </HStack>
            </Box>
        </div>
    )
}

export default Navbar