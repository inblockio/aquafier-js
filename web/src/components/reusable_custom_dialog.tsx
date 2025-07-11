import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogCloseTrigger } from "@chakra-ui/react";



interface IReusableCustomDialog {
    open: boolean;
    setOpen: (open: boolean) => void;
    title: string;
    children: React.ReactNode;
    trigger?: React.ReactNode;
}

const ReusableCustomDialog = ({ open, setOpen, title, children, trigger }: IReusableCustomDialog) => {
    return (
        <Dialog.Root size={"md"} lazyMount open={open} onOpenChange={(e) => setOpen(e.open)}>
            <DialogTrigger asChild >
                {trigger}
            </DialogTrigger>
            <DialogContent borderRadius={"2xl"} overflow={"hidden"}>
                <DialogHeader py={"3"} px={"5"} bg={{ base: "rgb(188 220 255 / 22%)", _dark: "rgba(0, 0, 0, 0.3)" }}>
                    <DialogTitle fontWeight={500} color={"gray.800"} _dark={{ color: "white" }}>
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <DialogBody py={"8"} px={"5"}>
                    {children}
                </DialogBody>
                <DialogCloseTrigger />
            </DialogContent>
        </Dialog.Root>
    )
}

export default ReusableCustomDialog