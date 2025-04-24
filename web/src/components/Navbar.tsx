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
import { LuSquareChartGantt } from "react-icons/lu"

interface INavlinkItem {
    label: string
    to: string
    icon?: ReactNode
}

const navlinks: INavlinkItem[] = [
    {
        label: "Forms",
        to: "/aqua-forms"
    },
    // {
    //     label: "Form Generator",
    //     to: "/form-generator"
    // }
]

const CustomNavlinkItem = ({ label, to }: INavlinkItem) => {


    return (
        <Link to={to}>
            <LinkBox bg="blue.500" p={2} borderRadius="md">
                <Group>
                    <Text>{label}</Text>
                    <LuSquareChartGantt />
                </Group>
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
                    <HStack h={'100%'} gap={"4"} justifyContent={'space-between'}>
                        {
                            session ? (<>
                                <Group gap={4}>
                                    {
                                        navlinks.map((item, i: number) => (
                                            <CustomNavlinkItem key={`navitem_${i}`} {...item} />
                                        ))
                                    }
                                </Group>
                            </>
                            ) : null
                        }
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