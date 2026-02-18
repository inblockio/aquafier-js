import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'

interface IReusableCustomDialog {
      open: boolean
      setOpen: (open: boolean) => void
      title: string
      children: React.ReactNode
      trigger?: React.ReactNode
}

const ReusableCustomDialog = ({ open, setOpen, title, children, trigger }: IReusableCustomDialog) => {
      return (
            <Dialog open={open} onOpenChange={setOpen}>
                  {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
                  <DialogContent className="max-w-md rounded-2xl overflow-hidden">
                        <DialogHeader className="py-3 px-5 bg-blue-50/50 dark:bg-gray-800/30">
                              <DialogTitle className="font-medium text-gray-800 dark:text-white">
                                    {title}
                              </DialogTitle>
                        </DialogHeader>
                        <div className="py-8 px-5">
                              {children}
                        </div>
                  </DialogContent>
            </Dialog>
      )
}

export default ReusableCustomDialog
