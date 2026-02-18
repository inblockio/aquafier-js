// import { Button } from "@/components/ui/button";
import { Button } from '@/components/ui/button'
import { IItemDetailData } from '@/models/AquaTreeDetails'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
// import { IItemDetailData } from "../models/AquaTreeDetails";

export const ItemDetail = ({ label, value, displayValue, showCopyIcon }: IItemDetailData) => {
      const copyToClipboard = async () => {
            try {
                  await navigator.clipboard.writeText(value)
                  toast.success('Copied to clipboard')
            } catch (err) {
                  console.error('Failed to copy text: ', err)
            }
      }

      return (
            <div className="flex flex-col items-start w-full gap-1">
                  <span className="text-sm font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                        <span className="font-mono text-sm break-words break-all">{displayValue}</span>
                        {showCopyIcon && (
                              <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-6 w-6 p-0">
                                    <Copy className="h-3 w-3" />
                              </Button>
                        )}
                  </div>
            </div>
      )
}
