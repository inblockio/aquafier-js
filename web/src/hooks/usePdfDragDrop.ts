import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { SignatureData } from '@/types/types'

interface UsePdfDragDropProps {
      pdfMainContainerRef: React.RefObject<HTMLDivElement | null>
      setSignaturePositions: React.Dispatch<React.SetStateAction<SignatureData[]>>
}

interface UsePdfDragDropReturn {
      activeDragId: string | null
      setActiveDragId: React.Dispatch<React.SetStateAction<string | null>>
      isDragging: boolean
      setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
}

export function usePdfDragDrop({
      pdfMainContainerRef,
      setSignaturePositions,
}: UsePdfDragDropProps): UsePdfDragDropReturn {
      const [activeDragId, setActiveDragId] = useState<string | null>(null)
      const [isDragging, setIsDragging] = useState(false)

      // Helper function to get position from either mouse or touch event
      const getEventPosition = (e: MouseEvent | TouchEvent) => {
            if ('touches' in e && e.touches.length > 0) {
                  return {
                        clientX: e.touches[0].clientX,
                        clientY: e.touches[0].clientY,
                  }
            }
            return {
                  clientX: (e as MouseEvent).clientX,
                  clientY: (e as MouseEvent).clientY,
            }
      }

      const handleDragMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging || !activeDragId || !pdfMainContainerRef.current) return

            e.preventDefault()

            const rect = pdfMainContainerRef.current.getBoundingClientRect()
            const pdfElement = pdfMainContainerRef.current.querySelector('.react-pdf__Page')
            const pdfRect = pdfElement ? pdfElement.getBoundingClientRect() : rect

            const { clientX, clientY } = getEventPosition(e)

            const x = clientX - pdfRect.left
            const y = clientY - pdfRect.top

            const relativeX = x / pdfRect.width
            const relativeY = 1 - y / pdfRect.height

            setSignaturePositions(prev =>
                  prev.map(pos => {
                        if (pos.id === activeDragId) {
                              return {
                                    ...pos,
                                    x: relativeX,
                                    y: relativeY,
                                    isDragging: true,
                              }
                        }
                        return pos
                  })
            )
      }

      const handleDragEnd = () => {
            if (!isDragging) return

            setSignaturePositions(prev =>
                  prev.map(pos => ({
                        ...pos,
                        isDragging: false,
                  }))
            )

            setActiveDragId(null)
            setIsDragging(false)

            toast.success('Signature position updated', {
                  duration: 2000,
            })
      }

      // Add event listeners for drag operations
      useEffect(() => {
            if (isDragging) {
                  document.addEventListener('mousemove', handleDragMove as any)
                  document.addEventListener('mouseup', handleDragEnd)

                  document.addEventListener('touchmove', handleDragMove as any, {
                        passive: false,
                  })
                  document.addEventListener('touchend', handleDragEnd)
                  document.addEventListener('touchcancel', handleDragEnd)
            }

            return () => {
                  document.removeEventListener('mousemove', handleDragMove as any)
                  document.removeEventListener('mouseup', handleDragEnd)
                  document.removeEventListener('touchmove', handleDragMove as any)
                  document.removeEventListener('touchend', handleDragEnd)
                  document.removeEventListener('touchcancel', handleDragEnd)
            }
      }, [isDragging, activeDragId])

      return {
            activeDragId,
            setActiveDragId,
            isDragging,
            setIsDragging,
      }
}
