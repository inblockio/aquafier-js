import { AppSidebar } from "@/components/app_sidebar"
import { ConnectWallet } from "@/components/connect_wallet"
import { ConnectWalletPage } from "@/components/connect_wallet_page"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import appStore from "@/store"
import { Bell, Users, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { ClipLoader } from "react-spinners"
import { Toaster } from "sonner"
import { useStore } from "zustand"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button"
import CreateFormFromTemplate from "@/components/aqua_forms/CreateFormFromTemplate";
import { ScrollArea } from "@/components/ui/scroll-area"
import FormTemplateEditorShadcn from "@/components/aqua_forms/FormTemplateEditorShadcn"

export default function NewShadcnLayoutWithSidebar() {
    const { session, openCreateAquaSignPopUp, setOpenCreateAquaSignPopUp, openCreateTemplatePopUp, setOpenCreateTemplatePopUp, formTemplates } = useStore(appStore);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);


    const [isOpenCreateAquaSignPopUp, setIsOpenCreateAquaSignPopUp] = useState(false);
    const [isOpenCreateTemplatePopUp, setIsOpenCreateTemplatePopUp] = useState(false);




    useEffect(() => {
        if (openCreateAquaSignPopUp) {
            setIsOpenCreateAquaSignPopUp(true)
        } else {
            setIsOpenCreateAquaSignPopUp(false)

        }
    }, [openCreateAquaSignPopUp]);



    useEffect(() => {
        if (openCreateTemplatePopUp) {
            setIsOpenCreateTemplatePopUp(true)
        } else {
            setIsOpenCreateTemplatePopUp(false)

        }
    }, [openCreateTemplatePopUp]);



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



            {/* create template dialog */}
            <Dialog open={isOpenCreateTemplatePopUp} onOpenChange={(openState) => {
                setOpenCreateTemplatePopUp(openState)
                // if(!openState){
                //     setSelectedFileInfo(null)
                //     setOpenDetailsPopUp(false)
                // }
            }} >

                <DialogContent className="[&>button]:hidden !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col">
                    <div className="absolute top-4 right-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 bg-red-500 text-white hover:bg-red-500"
                            onClick={() => {
                                setOpenCreateTemplatePopUp(false)
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <FormTemplateEditorShadcn onSave={function (): void {
                       setOpenCreateTemplatePopUp(false)
                    } } />
                    {/* <DialogFooter className="mt-auto">
                        <Button variant="outline" onClick={() => {
                           setOpenCreateAquaSignPopUp(false)
                        }}>Cancel</Button>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter> */}
                </DialogContent>
            </Dialog>


            {/* create aqua sign  */}

            <Dialog open={isOpenCreateAquaSignPopUp} onOpenChange={(openState) => {
                setOpenCreateAquaSignPopUp(openState)
                // if(!openState){
                //     setSelectedFileInfo(null)
                //     setOpenDetailsPopUp(false)
                // }
            }} >

                <DialogContent className="[&>button]:hidden !max-w-[65vw] !w-[65vw] h-[65vh] max-h-[65vh] flex flex-col p-0 gap-0">
                    <div className="absolute top-4 right-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 bg-red-500 text-white hover:bg-red-500"
                            onClick={() => {
                                setOpenCreateAquaSignPopUp(false)
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <DialogHeader className="!h-[60px] !min-h-[60px] !max-h-[60px] flex justify-center px-6">
                        {/* <DialogTitle>Create Aqua Sign</DialogTitle> */}
                    </DialogHeader>
                    <div className=' h-[calc(100%-60px)] pb-1'>
                    <ScrollArea className="h-full">
                        <CreateFormFromTemplate selectedTemplate={formTemplates.find((template) => template.name === "aqua_sign")!!} callBack={function (): void {
                            setOpenCreateAquaSignPopUp(false)
                        }} openCreateTemplatePopUp={false} />
                    </ScrollArea>
                    </div>
                    {/* <DialogFooter className="mt-auto">
                        <Button variant="outline" onClick={() => {
                           setOpenCreateAquaSignPopUp(false)
                        }}>Cancel</Button>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter> */}
                </DialogContent>
            </Dialog>
        </>
    )
}
