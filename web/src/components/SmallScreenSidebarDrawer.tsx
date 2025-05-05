"use client"

// import { Button, Drawer, IconButton, Portal } from "@chakra-ui/react"
import { useState } from "react"
import { CloseButton } from "./chakra-ui/close-button"
import { FaBars, FaWpforms } from "react-icons/fa6";
import { DrawerBackdrop, DrawerBody, DrawerCloseTrigger, DrawerContent, DrawerFooter, DrawerHeader, DrawerRoot, DrawerTitle, DrawerTrigger } from "./chakra-ui/drawer";
import { IconButton, Portal, Drawer, Stack, Text, HStack, Box } from "@chakra-ui/react";
import { LuInfo, LuMoon, LuShare2, LuSun } from "react-icons/lu";
import { Button } from "./chakra-ui/button";
import { HiOutlineClipboardDocument } from "react-icons/hi2";
import { Link } from "react-router-dom";
import Settings from "./chakra-ui/settings";
import AccountContracts from "./AccountContracts";
import VersionAndDisclaimer from "./VersionAndDisclaimer";
import { GrHomeOption } from "react-icons/gr";
import { useColorMode } from "./chakra-ui/color-mode";
import { ISidebarNavItem } from "../types/index";

const SidebarNavItem = ({ icon, label, onClick, href }: ISidebarNavItem) => {

    const {colorMode} = useColorMode()

    return (
        <Box onClick={() => onClick && onClick()}>
            {
                href ? (
                    <Link to={href}>
                        <HStack cursor={"pointer"} className="hover:bg-gray-100" css={{
                            "&:hover": {
                                bg: colorMode === "light" ? "gray.100" : "blackAlpha.600"
                            }
                        }} p={"1"} borderRadius={"md"}>
                            <IconButton variant="outline" size="sm" borderRadius={"md"}>
                                {icon}
                            </IconButton>
                            <Text>{label}</Text>
                        </HStack>
                    </Link>
                ) : (
                    <HStack cursor={"pointer"} className="hover:bg-gray-100" css={{
                        "&:hover": {
                            bg: colorMode === "light" ? "gray.100" : "blackAlpha.600"
                        }
                    }} p={"1"} borderRadius={"md"}>
                        <IconButton variant="outline" size="sm" borderRadius={"md"}>
                            {icon}
                        </IconButton>
                        <Text>{label}</Text>
                    </HStack>
                )
            }
        </Box>
    )
}

interface ISmallScreenSidebarDrawer {
    openCreateForm: () => void
}

const SmallScreenSidebarDrawer = ({ openCreateForm }: ISmallScreenSidebarDrawer) => {
    const [open, setOpen] = useState(false)
    const [contractsOpen, setContractsOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [versionOpen, setVersionOpen] = useState(false)
    const {colorMode, toggleColorMode} = useColorMode()

    const handleClose = () => {
        setOpen(false)
    }

    const handleLinkClick = (func?: () => void) => {
        handleClose()
        func?.()
    }

    return (
        <>
            <DrawerRoot open={open} placement={"start"} onOpenChange={(e) => setOpen(e.open)}>
                <DrawerTrigger asChild>
                    <IconButton variant="outline" size="sm">
                        <FaBars />
                    </IconButton>
                </DrawerTrigger>
                <Portal>
                    <DrawerBackdrop />
                    <Drawer.Positioner>
                        <DrawerContent>
                            <DrawerHeader py={"3"} px={"5"}>
                                <DrawerTitle>Menu</DrawerTitle>
                                <DrawerCloseTrigger asChild>
                                    <CloseButton size="sm" />
                                </DrawerCloseTrigger>
                            </DrawerHeader>
                            <DrawerBody display={"flex"} flexDirection={"column"}>
                                <Stack>
                                    <SidebarNavItem icon={<GrHomeOption />} href="/" label="Home" onClick={() => handleLinkClick()} />
                                    <SidebarNavItem icon={<HiOutlineClipboardDocument />} href="/aqua-forms" label="Manage Form Templates" onClick={() => handleLinkClick()} />
                                    <SidebarNavItem icon={<FaWpforms />} label="Create Form" onClick={() => handleLinkClick(openCreateForm)} />
                                    <SidebarNavItem icon={<LuShare2 />} label="Shared Contracts" onClick={() => handleLinkClick(() => setContractsOpen(true))} />
                                    <SidebarNavItem icon={<LuInfo />} label="Info" onClick={() => handleLinkClick(() => setVersionOpen(true))} />
                                </Stack>
                                <Box flex={1} />
                                <Stack>
                                    <SidebarNavItem icon={<Settings />} label="Settings" onClick={() => handleLinkClick(() => setSettingsOpen(true))} />
                                    {/* <SidebarNavItem icon={<LuUser />} label="Account" onClick={() => handleLinkClick()} /> */}
                                    <SidebarNavItem icon={colorMode === "light" ? <LuMoon /> : <LuSun />} label={colorMode === "light" ? "Dark Mode" : "Light Mode"} onClick={() => handleLinkClick(toggleColorMode)} />
                                </Stack>
                            </DrawerBody>
                            <DrawerFooter>
                                <DrawerCloseTrigger>
                                    <Button variant="solid" size="sm" bg="blue.500">
                                        Close
                                    </Button>
                                </DrawerCloseTrigger>
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer.Positioner>
                </Portal>
            </DrawerRoot>
            <AccountContracts inline open={contractsOpen} updateOpenStatus={(open) => setContractsOpen(open)} />
            <Settings inline open={settingsOpen} updateOpenStatus={(open) => setSettingsOpen(open)} />
            <VersionAndDisclaimer inline open={versionOpen} updateOpenStatus={(open) => setVersionOpen(open)} />
        </>
    )
}

export default SmallScreenSidebarDrawer
