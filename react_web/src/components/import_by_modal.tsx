import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'

const ImportByModal = () => {

      return (
            <Dialog>
                  <DialogTrigger asChild>
                        <Button data-testid="import-7-button" variant="outline" size="sm">
                              Import
                        </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                        <DialogHeader>
                              <DialogTitle>Import Aqua Tree</DialogTitle>
                              <DialogDescription>
                                    Import an existing Aqua Tree file to view and manage your claims.
                              </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                              <p className="text-muted-foreground">Fix me</p>
                              {/* {
                                    apiFileInfo ? (
                                          <ImportPage incomingFileInfo={apiFileInfo} />
                                    ) : null
                              } */}
                        </div>
                  </DialogContent>
            </Dialog>
      )
}

export default ImportByModal
