import { AppSidebar } from "@/components/app-sidebar"
import { ConnectWallet } from "@/components/ConnectWallet"
import { ConnectWalletPage } from "@/components/ConnectWalletPage"
import { Separator } from "@/components/shadcn/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/shadcn/ui/sidebar"
import appStore from "@/store"
import { Bell, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { ClipLoader } from "react-spinners"
import { Toaster } from "sonner"
import { useStore } from "zustand"

export default function NewShadcnLayoutWithSidebar() {
    const { session } = useStore(appStore);

     const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                width: "100vw"
            }}>

                <ClipLoader
                    color={"blue"}
                    loading={loading}
                    size={150}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                />
                <span style={{ fontSize: 24, fontWeight: 500 }}>Loading...</span>
            </div>
        );
    }


    return (
        <>
            {
                session == null ? <>
                    <ConnectWalletPage dataTestId="sign-in-pages" />
                </>
                    :
                    <SidebarProvider>
                        <AppSidebar />
                        <SidebarInset>
                            <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 z-50 bg-gray-50 w-full">
                                <div className="flex items-center gap-2 px-3 w-full">
                                    <SidebarTrigger />
                                    <Separator orientation="vertical" className="mr-2 h-4" />
                                    <div className="flex items-center space-x-4 ms-auto">
                                        <button className="p-2 text-gray-500 hover:text-gray-700">
                                            <Bell className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 text-gray-500 hover:text-gray-700">
                                            <Users className="w-5 h-5" />
                                            {/* <span className="ml-1 text-sm">Invite members</span> */}
                                        </button>
                                        <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                                            Start free trial
                                        </button>
                                        {/* <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                A
                            </div> */}
                                        <ConnectWallet dataTestId="sign-in-button-files-list" />
                                    </div>
                                </div>
                            </header>
                            <div className="flex flex-1 flex-col gap-4 p-4">
                                <Toaster position="top-right" richColors />
                                <Outlet />
                            </div>
                        </SidebarInset>
                    </SidebarProvider>
            }
        </>
    )
}
