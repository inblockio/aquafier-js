import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

export interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
      marks?: Array<number | { value: number; label: React.ReactNode }>
      label?: React.ReactNode
      showValue?: boolean
}

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
      ({ className, marks: marksProp, label, showValue, defaultValue, value, min = 0, max = 100, ...props }, ref) => {
            const currentValue = value ?? defaultValue ?? [min]

            const marks = marksProp?.map(mark => {
                  if (typeof mark === 'number') return { value: mark, label: undefined }
                  return mark
            })

            const hasMarkLabel = !!marks?.some(mark => mark.label)

            // Calculate position percentage for marks
            const getMarkPosition = (markValue: number) => {
                  return ((markValue - min) / (max - min)) * 100
            }

            return (
                  <div className="w-full space-y-2">
                        {/* Label and Value Display */}
                        {label && !showValue && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
                        {label && showValue && (
                              <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>
                                    <span className="text-sm text-muted-foreground">{Array.isArray(currentValue) ? currentValue.join(' - ') : currentValue}</span>
                              </div>
                        )}

                        {/* Slider Container */}
                        <div className="relative">
                              <SliderPrimitive.Root
                                    ref={ref}
                                    className={cn(
                                          'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
                                          hasMarkLabel && 'pb-6', // Add padding for mark labels
                                          className
                                    )}
                                    defaultValue={defaultValue}
                                    value={value}
                                    min={min}
                                    max={max}
                                    {...props}
                              >
                                    <SliderPrimitive.Track className="bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5">
                                          <SliderPrimitive.Range className="bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full" />
                                    </SliderPrimitive.Track>

                                    {/* Render thumbs based on value array length */}
                                    {Array.from(
                                          {
                                                length: Array.isArray(currentValue) ? currentValue.length : 1,
                                          },
                                          (_, index) => (
                                                <SliderPrimitive.Thumb
                                                      key={index}
                                                      className="border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
                                                />
                                          )
                                    )}
                              </SliderPrimitive.Root>

                              {/* Marks */}
                              {marks && marks.length > 0 && (
                                    <div className="relative">
                                          {marks.map((mark, index) => {
                                                const markValue = typeof mark === 'number' ? mark : mark.value
                                                const markLabel = typeof mark === 'number' ? undefined : mark.label
                                                const position = getMarkPosition(markValue)

                                                return (
                                                      <div
                                                            key={index}
                                                            className="absolute"
                                                            style={{
                                                                  left: `${position}%`,
                                                                  transform: 'translateX(-50%)',
                                                            }}
                                                      >
                                                            {/* Mark indicator */}
                                                            <div className="w-1 h-1 bg-border rounded-full -mt-0.5" />

                                                            {/* Mark label */}
                                                            {markLabel && (
                                                                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">{markLabel}</div>
                                                            )}
                                                      </div>
                                                )
                                          })}
                                    </div>
                              )}
                        </div>
                  </div>
            )
      }
)

Slider.displayName = 'Slider'

export { Slider }
