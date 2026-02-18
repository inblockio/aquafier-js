import React from 'react'
import { FormField } from './types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WalletAutosuggest } from '../wallet_connect/wallet_auto_suggest'

/** Props for the SortableSignerItem component */
export interface SortableSignerItemProps {
      id: string
      index: number
      address: string
      field: FormField
      multipleAddresses: string[]
      setMultipleAddresses: React.Dispatch<React.SetStateAction<string[]>>
      // walletAddresses: { address: string; name?: string }[]
      onRemove: (index: number) => void
      canRemove: boolean
}

/** Sortable signer item component for drag-and-drop reordering */
const SortableSignerItem = ({
      id,
      index,
      address,
      field,
      multipleAddresses,
      setMultipleAddresses,
      // walletAddresses,
      onRemove,
      canRemove
}: SortableSignerItemProps) => {
      const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging
      } = useSortable({ id })

      const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
            zIndex: isDragging ? 1000 : 'auto'
      }

      return (
            <div
                  ref={setNodeRef}
                  style={style}
                  className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-4 bg-gray-50 rounded-lg border ${isDragging ? 'shadow-lg border-blue-300 bg-blue-50' : ''}`}
            >
                  {/* Drag handle */}
                  <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded touch-none"
                        title="Drag to reorder"
                  >
                        <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>

                  {/* Index badge */}
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-medium text-sm">
                        {index + 1}
                  </div>

                  {/* Wallet input */}
                  <div className="flex-1">
                        <WalletAutosuggest
                              // walletAddresses={walletAddresses}
                              field={field}
                              index={index}
                              address={address}
                              multipleAddresses={multipleAddresses}
                              setMultipleAddresses={setMultipleAddresses}
                              // placeholder="Enter signer wallet address"
                              className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                  </div>

                  {/* Remove button */}
                  {canRemove && (
                        <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              className="rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                              onClick={() => onRemove(index)}
                        >
                              <Trash2 className="h-4 w-4" />
                        </Button>
                  )}
            </div>
      )
}

export default SortableSignerItem
