import { ReactNode } from "react"
import Navbar from "../components/navbar/Navbar"
import { Outlet, useLocation } from "react-router-dom";
import { ColorModeProvider } from "@/components/chakra-ui/color-mode";
import { EnvironmentProvider, ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { Toaster } from "../components/chakra-ui/toaster.tsx"

interface IMainLayout {
    children: ReactNode
}

const MainLayout = ({ children }: IMainLayout) => {
    const location = useLocation();

    // Check if the current path is '/files'
    const isFilesPath = location.pathname === '/files' || location.pathname.startsWith('/files') || location.pathname === '/home' || location.pathname.startsWith('/home');

    return (
        <div>
            <EnvironmentProvider>
                <ChakraProvider value={defaultSystem}>
                    <ColorModeProvider>
                        <Toaster />
                        {!isFilesPath && <Navbar />}
                        {children}
                    </ColorModeProvider>
                </ChakraProvider>
            </EnvironmentProvider>
        </div>
    )
}

export const MainLayoutHolder = () => {
    return (
        <MainLayout>
            <Outlet />
        </MainLayout>
    )
}

export default MainLayout