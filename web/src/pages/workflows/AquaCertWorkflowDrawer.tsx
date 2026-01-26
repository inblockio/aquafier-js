import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IAquaCertWorkflowDrawer } from "@/types/types"
import { getFileName } from "@/utils/functions"
import WalletAdrressClaim from "../v2_claims_workflow/WalletAdrressClaim"
import { Button } from "@/components/ui/button"
import { LuX } from "react-icons/lu"

export default function AquaCertWorkflowDrawer({ open, onClose, attestors, fileInfo }: IAquaCertWorkflowDrawer) {
    let fileName = getFileName(fileInfo?.aquaTree!)
    console.log(attestors)
    return (
        <div className="right">
            <Drawer
                direction={"right"}
                open={open}
                onClose={onClose}
            >
                <DrawerContent className="rounded-tl-2xl rounded-bl-2xl !max-w-none !w-full sm:!w-[400px] md:!w-[500px] lg:!w-[800px]">
                    <DrawerHeader>
                        <div className="flex justify-between">
                            <div>
                                <DrawerTitle>{fileName}</DrawerTitle>
                                <DrawerDescription>
                                    Certificate Information
                                </DrawerDescription>
                            </div>
                            <div>
                                <Button variant={"destructive"} onClick={() => onClose && onClose()} className="cursor-pointer">
                                    <LuX />
                                </Button>
                            </div>
                        </div>
                    </DrawerHeader>
                    <div className="no-scrollbar overflow-y-auto px-4 overflow-x-hidden">
                        <Table className="table-fixed w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/2">Name</TableHead>
                                    <TableHead className="w-1/2">Context</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {
                                    attestors.map((attester, index) => (
                                        <TableRow key={`attestation_${index}`}>
                                            <TableCell className="truncate max-w-0">
                                                <WalletAdrressClaim walletAddress={attester.walletAddress} />
                                            </TableCell>
                                            <TableCell className="wrap-break-word" style={{
                                                whiteSpace: "wrap"
                                            }}>
                                                {attester.context}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                }

                            </TableBody>
                        </Table>
                    </div>
                    {/* <DrawerFooter>
                        <Button>Submit</Button>
                        <DrawerClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter> */}
                </DrawerContent>
            </Drawer>
        </div>
    )
}
