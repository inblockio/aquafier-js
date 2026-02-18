import React, { JSX } from 'react'
import { FormField, FormTemplate } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
      AlertCircle,
      BookCheck,
      FileText,
      GripVertical,
      Image,
      Link,
      Loader2,
      Pen,
      Plus,
      RotateCcw,
      Send,
      Type,
      Upload,
      User,
      Wallet
} from 'lucide-react'
import { WalletAutosuggest } from '../wallet_connect/wallet_auto_suggest'
import SignatureCanvas from 'react-signature-canvas'
import {
      DndContext,
      closestCenter,
      KeyboardSensor,
      PointerSensor,
      useSensor,
      useSensors,
      DragEndEvent
} from '@dnd-kit/core'
import {
      arrayMove,
      SortableContext,
      sortableKeyboardCoordinates,
      verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ApiInfoData } from '@/types/types'
import { Session } from '@/types'
import { toast } from 'sonner'

// Re-export SortableSignerItem props interface for consumers
export interface SortableSignerItemProps {
      id: string
      index: number
      address: string
      field: FormField
      multipleAddresses: string[]
      setMultipleAddresses: React.Dispatch<React.SetStateAction<string[]>>
      onRemove: (index: number) => void
      canRemove: boolean
}

/** Custom input type matching the parent component's definition */
export type CustomInputType = string | File | number | File[]

// ============================================
// PURE UTILITY FUNCTIONS (no component state needed)
// ============================================

/** Returns an icon component based on the field type */
export const getFieldIcon = (type: string): JSX.Element | null => {
      switch (type) {
            case 'string':
                  return <Pen className="h-4 w-4" />
            case 'wallet_address':
                  return <Wallet className="h-4 w-4" />
            case 'domain':
                  return <Link className="h-4 w-4" />
            case 'document':
                  return <FileText className="h-4 w-4" />
            case 'image':
                  return <Image className="h-4 w-4" />
            case 'file':
                  return <Upload className="h-4 w-4" />
            default:
                  return null
      }
}

/** Returns the HTML input type based on the field type */
export const getInputType = (fieldType: string): string => {
      if (fieldType === 'image' || fieldType === 'document') {
            return 'file'
      }
      if (['text', 'domain', 'wallet_address', 'signature', 'email'].includes(fieldType)) {
            return 'text'
      }
      return fieldType
}

/** Gets the placeholder text for a field */
export const getFieldPlaceholder = (field: FormField): string => {
      if (field.type === 'domain') return 'Fill in the Domain Name (FQDN)'
      if (field.type === 'date') return 'Select a date'
      if (field.type === 'document') return 'Upload PDF document'
      return `Enter ${field.label.toLowerCase()}`
}

// ============================================
// PROPS INTERFACES FOR RENDERER COMPONENTS
// ============================================

/** Props required by the FormErrorRenderer */
export interface FormErrorRendererProps {
      errorMessage: string
}

/** Props required by the ArrayFieldRenderer */
export interface ArrayFieldRendererProps {
      field: FormField
      fieldIndex: number
      selectedTemplate: FormTemplate
      multipleAddresses: string[]
      setMultipleAddresses: React.Dispatch<React.SetStateAction<string[]>>
      session: Session | null
      addAddress: () => void
      removeAddress: (index: number) => void
      SortableSignerItemComponent: React.ComponentType<SortableSignerItemProps>
}

/** Props required by the OptionsFieldRenderer */
export interface OptionsFieldRendererProps {
      field: FormField
      fieldIndex: number
      selectedTemplate: FormTemplate
      formData: Record<string, CustomInputType>
      setFormData: React.Dispatch<React.SetStateAction<Record<string, CustomInputType>>>
}

/** Props required by the ScratchpadFieldRenderer */
export interface ScratchpadFieldRendererProps {
      signatureRef: React.RefObject<SignatureCanvas | null>
      containerRef: React.RefObject<HTMLDivElement | null>
      canvasSize: { width: number; height: number }
      clearSignature: () => void
      generateSignatureFromText: (text: string, isInitials: boolean) => void
      getUserNameForSignature: () => string
}

/** Props required by the SingleFieldRenderer */
export interface SingleFieldRendererProps {
      field: FormField
      fieldIndex: number
      formData: Record<string, CustomInputType>
      setFormData: React.Dispatch<React.SetStateAction<Record<string, CustomInputType>>>
      selectedTemplate: FormTemplate
      session: Session | null
      multipleAddresses: string[]
      setMultipleAddresses: React.Dispatch<React.SetStateAction<string[]>>
      addAddress: () => void
      removeAddress: (index: number) => void
      signatureRef: React.RefObject<SignatureCanvas | null>
      containerRef: React.RefObject<HTMLDivElement | null>
      canvasSize: { width: number; height: number }
      clearSignature: () => void
      generateSignatureFromText: (text: string, isInitials: boolean) => void
      getUserNameForSignature: () => string
      getFieldDefaultValue: (field: FormField, currentState: CustomInputType | undefined) => string | number | File | File[]
      verfyingFormFieldEnabled: ApiInfoData | null
      verifyingFormField: string
      handleTextInputChange: (e: React.ChangeEvent<HTMLInputElement>, field: FormField) => void
      handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>, field: FormField) => void
      handleSendVerificationCode: (field: FormField) => void
      handleVerificationCodeChange: (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => void
      handleWalletAddressSelect: (data: string[], fieldName: string) => void
      SortableSignerItemComponent: React.ComponentType<SortableSignerItemProps>
}

/** Props required by the AquaSignFormRenderer */
export interface AquaSignFormRendererProps {
      selectedTemplate: FormTemplate
      formData: Record<string, CustomInputType>
      setFormData: React.Dispatch<React.SetStateAction<Record<string, CustomInputType>>>
      session: Session | null
      multipleAddresses: string[]
      setMultipleAddresses: React.Dispatch<React.SetStateAction<string[]>>
      addAddress: () => void
      removeAddress: (index: number) => void
      signatureRef: React.RefObject<SignatureCanvas | null>
      containerRef: React.RefObject<HTMLDivElement | null>
      canvasSize: { width: number; height: number }
      clearSignature: () => void
      generateSignatureFromText: (text: string, isInitials: boolean) => void
      getUserNameForSignature: () => string
      getFieldDefaultValue: (field: FormField, currentState: CustomInputType | undefined) => string | number | File | File[]
      verfyingFormFieldEnabled: ApiInfoData | null
      verifyingFormField: string
      handleTextInputChange: (e: React.ChangeEvent<HTMLInputElement>, field: FormField) => void
      handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>, field: FormField) => void
      handleSendVerificationCode: (field: FormField) => void
      handleVerificationCodeChange: (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => void
      handleWalletAddressSelect: (data: string[], fieldName: string) => void
      aquaSignStep: 1 | 2
      setAquaSignStep: React.Dispatch<React.SetStateAction<1 | 2>>
      setModalFormErrorMessage: React.Dispatch<React.SetStateAction<string>>
      reorderInputFields: (fields: FormField[]) => FormField[]
      SortableSignerItemComponent: React.ComponentType<SortableSignerItemProps>
}

// ============================================
// RENDERER COMPONENTS
// ============================================

/** Renders the form error alert */
export const FormErrorRenderer: React.FC<FormErrorRendererProps> = ({ errorMessage }) => {
      if (errorMessage.length === 0) return null
      return (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
      )
}

/** Renders the array field (multiple signers) with drag-and-drop reordering */
export const ArrayFieldRenderer: React.FC<ArrayFieldRendererProps> = ({
      field,
      fieldIndex,
      selectedTemplate,
      multipleAddresses,
      setMultipleAddresses,
      session,
      addAddress,
      removeAddress,
      SortableSignerItemComponent
}) => {
      const sensors = useSensors(
            useSensor(PointerSensor, {
                  activationConstraint: {
                        distance: 8,
                  },
            }),
            useSensor(KeyboardSensor, {
                  coordinateGetter: sortableKeyboardCoordinates,
            })
      )

      const signerIds = multipleAddresses.map((_: string, index: number) => `signer-${index}`)

      const handleDragEnd = (event: DragEndEvent) => {
            const { active, over } = event

            if (over && active.id !== over.id) {
                  const oldIndex = parseInt(String(active.id).split('-')[1])
                  const newIndex = parseInt(String(over.id).split('-')[1])

                  setMultipleAddresses((items: string[]) => arrayMove(items, oldIndex, newIndex))
            }
      }

      const userInSigners = multipleAddresses.some(addr =>
            addr.toLowerCase() === session?.address?.toLowerCase()
      )

      return (
            <div key={`field-${fieldIndex}`} className="space-y-4">
                  <div className="flex items-center justify-between">
                        <div>
                              <Label className="text-base sm:text-lg font-medium text-gray-900">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              {field.description && (
                                    <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                    <GripVertical className="h-3 w-3 inline-block mr-1" />
                                    {
                                          selectedTemplate.name === "aquafier_licence" ? " Drag to reorder receivers" : " Drag to reorder signers"
                                    }
                              </p>
                        </div>
                        <div className='flex gap-1'>
                              <Button onClick={(e) => {
                                    e.preventDefault()
                                    if (session) {
                                          setMultipleAddresses(curr => [...curr, session?.address])
                                    }
                              }} className={userInSigners ? "hidden" : ""} type='button'>
                                    Add Yourself
                              </Button>
                              <Button
                                    variant="outline"
                                    type="button"
                                    className="rounded-lg hover:bg-blue-50 hover:border-blue-300"
                                    onClick={addAddress}
                                    data-testid={`multiple_values_${field.name}`}
                              >
                                    <Plus className="h-4 w-4 mr-1" />
                                    {
                                          selectedTemplate.name === "aquafier_licence" ? "Add Receiver" : "Add Signer"
                                    }
                              </Button>
                        </div>
                  </div>

                  <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                  >
                        <SortableContext items={signerIds} strategy={verticalListSortingStrategy}>
                              <div className="space-y-3">
                                    {multipleAddresses.map((address: string, index: number) => (
                                          <SortableSignerItemComponent
                                                key={signerIds[index]}
                                                id={signerIds[index]}
                                                index={index}
                                                address={address}
                                                field={field}
                                                multipleAddresses={multipleAddresses}
                                                setMultipleAddresses={setMultipleAddresses}
                                                onRemove={removeAddress}
                                                canRemove={multipleAddresses.length > 1}
                                          />
                                    ))}
                              </div>
                        </SortableContext>
                  </DndContext>
            </div>
      )
}

/** Renders the options field; if the selected value is "other", shows a text input */
export const OptionsFieldRenderer: React.FC<OptionsFieldRendererProps> = ({
      field,
      fieldIndex,
      selectedTemplate,
      formData,
      setFormData
}) => {
      const otherFieldsExist = selectedTemplate.fields.find(
            (f: FormField) => f.depend_on_field === field.name && f.depend_on_value?.toLocaleLowerCase() === 'other' && f.is_hidden === true
      )

      return (
            <div className="space-y-2" key={`fieldKey_${fieldIndex}`}>
                  <Select
                        onValueChange={(value) => {
                              const fieldName = field.name
                              setFormData(prev => ({ ...prev, [fieldName]: value }))
                        }}
                  >
                        <SelectTrigger id={`input-options-${field.name}`} data-testid={`input-options-${field.name}`} className="w-full">
                              <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                              {field.options?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                        </SelectContent>
                  </Select>

                  {otherFieldsExist && (
                        <>
                              {((formData[field.name] as string) ?? '')?.toLocaleLowerCase() === 'other' && otherFieldsExist && (
                                    <Label htmlFor={`input-options-other`} className="text-sm font-medium text-gray-900">
                                          Please specify
                                    </Label>
                              )}
                              {((formData[field.name] as string) ?? '').toLocaleLowerCase() === 'other' && otherFieldsExist && (
                                    <Input
                                          id={`input-options-other`}
                                          data-testid={`input-options-other`}
                                          className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
                                          placeholder="Please specify"
                                          onChange={(e) => {
                                                const fieldName = otherFieldsExist!.name
                                                setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))
                                          }}
                                    />
                              )}
                        </>
                  )}
            </div>
      )
}

/** Renders the signature/scratchpad field with Reset, Generate from Name, and Initials buttons */
export const ScratchpadFieldRenderer: React.FC<ScratchpadFieldRendererProps> = ({
      signatureRef,
      containerRef,
      canvasSize,
      clearSignature,
      generateSignatureFromText,
      getUserNameForSignature
}) => (
      <div className="space-y-3">
            <div
                  ref={containerRef}
                  className="border border-gray-200 rounded-lg w-full h-50 bg-white relative"
            >
                  <SignatureCanvas
                        ref={signatureRef}
                        canvasProps={{
                              id: 'signature-canvas-id',
                              width: canvasSize.width,
                              height: canvasSize.height,
                              style: { width: '100%', height: '100%' },
                              className: 'signature-canvas cursor-crosshair',
                        }}
                        backgroundColor="transparent"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 text-sm">
                        Draw your signature here
                  </div>
            </div>

            <div className="flex flex-wrap gap-2">
                  <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearSignature}
                        className="flex items-center gap-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                  </Button>

                  <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => generateSignatureFromText(getUserNameForSignature(), false)}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 hover:border-blue-300"
                  >
                        <Type className="h-3.5 w-3.5" />
                        Generate from Name
                  </Button>

                  <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => generateSignatureFromText(getUserNameForSignature(), true)}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 hover:border-indigo-300"
                  >
                        <User className="h-3.5 w-3.5" />
                        Initials
                  </Button>
            </div>

            <p className="text-xs text-gray-500">
                  Draw your signature above, or use the buttons to generate one automatically.
            </p>
      </div>
)

/** Renders a single form field based on its type and configuration */
export const SingleFieldRenderer: React.FC<SingleFieldRendererProps> = ({
      field,
      fieldIndex,
      formData,
      setFormData,
      selectedTemplate,
      session,
      multipleAddresses,
      setMultipleAddresses,
      addAddress,
      removeAddress,
      signatureRef,
      containerRef,
      canvasSize,
      clearSignature,
      generateSignatureFromText,
      getUserNameForSignature,
      getFieldDefaultValue,
      verfyingFormFieldEnabled,
      verifyingFormField,
      handleTextInputChange,
      handleFileInputChange,
      handleSendVerificationCode,
      handleVerificationCodeChange,
      handleWalletAddressSelect,
      SortableSignerItemComponent
}) => {
      // Array fields (multiple signers) - delegate to ArrayFieldRenderer
      if (field.is_array && field.name !== "document") {
            return (
                  <ArrayFieldRenderer
                        field={field}
                        fieldIndex={fieldIndex}
                        selectedTemplate={selectedTemplate}
                        multipleAddresses={multipleAddresses}
                        setMultipleAddresses={setMultipleAddresses}
                        session={session}
                        addAddress={addAddress}
                        removeAddress={removeAddress}
                        SortableSignerItemComponent={SortableSignerItemComponent}
                  />
            )
      }

      if (field.is_hidden || !field.is_editable) {
            return null
      }

      return (
            <div key={`field-${fieldIndex}`} className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2">
                        {getFieldIcon(field.type)}
                        <Label htmlFor={`input-${field.name}`} className="text-base font-medium text-gray-900">
                              {field.label}
                              {field.required && <span className="text-red-500">*</span>}
                        </Label>
                  </div>

                  {/* Text, Number, Date, Domain, Email fields */}
                  {['text', 'number', 'date', 'domain', 'email'].includes(field.type) && (
                        <>
                              <Input
                                    id={`input-${field.name}`}
                                    data-testid={`input-${field.name}`}
                                    className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
                                    placeholder={getFieldPlaceholder(field)}
                                    defaultValue={(() => {
                                          const val = getFieldDefaultValue(field, formData[field.name] as CustomInputType | undefined)
                                          return val instanceof File || Array.isArray(val) ? undefined : val
                                    })()}
                                    maxLength={500}
                                    onChange={(e) => handleTextInputChange(e, field)}
                              />

                              {field.support_text && (
                                    <p className="text-xs text-gray-500">{field.support_text}</p>
                              )}
                              {/* Verification code section for verifiable fields */}
                              {field.is_verifiable && (
                                    <>
                                          <Button
                                                type="button"
                                                data-testid={`send-verification-code-${field.name}`}
                                                disabled={!verfyingFormFieldEnabled || !verfyingFormFieldEnabled?.isTwilioEnabled}
                                                onClick={() => handleSendVerificationCode(field)}
                                                className={`w-full flex items-center justify-center space-x-1 bg-blue-100 text-blue-700 px-3 py-2 rounded transition-colors text-xs ${verifyingFormField === `field-${field.name}` ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-200'
                                                      }`}
                                          >
                                                {verifyingFormField === `field-${field.name}` ? (
                                                      <>
                                                            <Loader2 className="animate-spin h-3 w-3 mr-1" />
                                                            <span>Sending code...</span>
                                                      </>
                                                ) : (
                                                      <>
                                                            <Send className="w-4 h-4" />
                                                            <span>Send Code</span>
                                                      </>
                                                )}
                                          </Button>

                                          <div className="flex items-center gap-2">
                                                <BookCheck className="h-4 w-4" />
                                                <Label
                                                      htmlFor={`input-verification-${field.name}`}
                                                      className="text-base font-medium text-gray-900"
                                                >
                                                      Verification code for {field.label}
                                                      <span className="text-red-500">*</span>
                                                </Label>
                                          </div>

                                          <Input
                                                id={`input-verification-${field.name}`}
                                                data-testid={`input-verification-${field.name}`}
                                                className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
                                                placeholder="Type code here..."
                                                onChange={(e) => handleVerificationCodeChange(e, field.name)}
                                          />
                                    </>
                              )}
                        </>
                  )}

                  {/* Signature/Scratchpad field with Reset, Generate from Name, Initials */}
                  {field.type === 'scratchpad' && (
                        <ScratchpadFieldRenderer
                              signatureRef={signatureRef}
                              containerRef={containerRef}
                              canvasSize={canvasSize}
                              clearSignature={clearSignature}
                              generateSignatureFromText={generateSignatureFromText}
                              getUserNameForSignature={getUserNameForSignature}
                        />
                  )}

                  {/* Options field */}
                  {field.type === 'options' && (
                        <OptionsFieldRenderer
                              field={field}
                              fieldIndex={fieldIndex}
                              selectedTemplate={selectedTemplate}
                              formData={formData}
                              setFormData={setFormData}
                        />
                  )}

                  {/* Wallet address field */}
                  {field.type === 'wallet_address' && (
                        <WalletAutosuggest
                              field={field}
                              index={0}
                              address={formData[field.name] ? (formData[field.name] as string) : ''}
                              multipleAddresses={[formData[field.name] as string || '']}
                              setMultipleAddresses={(data) => handleWalletAddressSelect(data, field.name)}
                              className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                  )}

                  {/* Document, Image, File upload fields */}
                  {['document', 'image', 'file'].includes(field.type) && (
                        <div className="relative">
                              <Input
                                    id={`input-${field.name}`}
                                    data-testid={`input-${field.name}`}
                                    className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base h-9 sm:h-10"
                                    type={getInputType(field.type)}
                                    required={field.required}
                                    accept={field.type === 'document' ? '.pdf' : field.type === 'image' ? 'image/*' : undefined}
                                    multiple={field.is_array}
                                    placeholder={getFieldPlaceholder(field)}
                                    onChange={(e) => handleFileInputChange(e, field)}
                              />

                              {field.support_text && (
                                    <p className="text-xs text-gray-500">{field.support_text}</p>
                              )}

                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <Upload className="h-4 w-4 text-gray-400" />
                              </div>
                        </div>
                  )}

                  {field.name === 'sender' && (!field.is_hidden || !field.is_editable) && (
                        <p className="text-xs text-gray-500">
                              {field.support_text
                                    ? field.support_text
                                    : 'The sender is the person who initiates the document signing process. This field is auto-filled with your wallet address.'}
                        </p>
                  )}
            </div>
      )
}

/** Renders the aqua_sign form with multi-step UI */
export const AquaSignFormRenderer: React.FC<AquaSignFormRendererProps> = ({
      selectedTemplate,
      formData,
      setFormData,
      session,
      multipleAddresses,
      setMultipleAddresses,
      addAddress,
      removeAddress,
      signatureRef,
      containerRef,
      canvasSize,
      clearSignature,
      generateSignatureFromText,
      getUserNameForSignature,
      getFieldDefaultValue,
      verfyingFormFieldEnabled,
      verifyingFormField,
      handleTextInputChange,
      handleFileInputChange,
      handleSendVerificationCode,
      handleVerificationCodeChange,
      handleWalletAddressSelect,
      aquaSignStep,
      setAquaSignStep,
      setModalFormErrorMessage,
      reorderInputFields,
      SortableSignerItemComponent
}) => {
      const fields = reorderInputFields(selectedTemplate!.fields)
      const documentField = fields.find(f => f.type === 'document')
      const otherFields = fields.filter(f => f.type !== 'document')

      const singleFieldProps = {
            formData,
            setFormData,
            selectedTemplate,
            session,
            multipleAddresses,
            setMultipleAddresses,
            addAddress,
            removeAddress,
            signatureRef,
            containerRef,
            canvasSize,
            clearSignature,
            generateSignatureFromText,
            getUserNameForSignature,
            getFieldDefaultValue,
            verfyingFormFieldEnabled,
            verifyingFormField,
            handleTextInputChange,
            handleFileInputChange,
            handleSendVerificationCode,
            handleVerificationCodeChange,
            handleWalletAddressSelect,
            SortableSignerItemComponent
      }

      return (
            <>
                  {/* Step indicator */}
                  <div className="flex items-center justify-center mb-6">
                        <div className="flex items-center gap-2">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${aquaSignStep === 1
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-green-500 text-white'
                                    }`}>
                                    {aquaSignStep === 1 ? '1' : '\u2713'}
                              </div>
                              <span className={`text-sm ${aquaSignStep === 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                                    Select Document
                              </span>
                              <div className="w-12 h-0.5 bg-gray-300 mx-2" />
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${aquaSignStep === 2
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-300 text-gray-600'
                                    }`}>
                                    2
                              </div>
                              <span className={`text-sm ${aquaSignStep === 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                                    Add Signers
                              </span>
                        </div>
                  </div>

                  {/* Step 1: Document Selection */}
                  {aquaSignStep === 1 && documentField && (
                        <div className="space-y-4">
                              <div className="text-center mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">Select the PDF document to be signed</h3>
                                    <p className="text-sm text-gray-500 mt-1">Upload the document that requires signatures</p>
                              </div>
                              <SingleFieldRenderer
                                    field={documentField}
                                    fieldIndex={0}
                                    {...singleFieldProps}
                              />

                              <div className="flex justify-end pt-4">
                                    <Button
                                          type="button"
                                          onClick={() => {
                                                if (!formData['document']) {
                                                      toast.error('Please select a document first')
                                                      return
                                                }
                                                setAquaSignStep(2)
                                          }}
                                          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                                          disabled={!formData['document']}
                                    >
                                          Go to add signers
                                    </Button>
                              </div>
                        </div>
                  )}

                  {/* Step 2: Sender and Signers */}
                  {aquaSignStep === 2 && (
                        <div className="space-y-4">
                              <div className="text-center mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">Specify who needs to sign this document</h3>
                              </div>

                              {otherFields.map((field, idx) => (
                                    <SingleFieldRenderer
                                          key={`aqua-sign-field-${idx}`}
                                          field={field}
                                          fieldIndex={idx}
                                          {...singleFieldProps}
                                    />
                              ))}

                              <div className="flex justify-between pt-4">
                                    <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => {
                                                setAquaSignStep(1)
                                                setModalFormErrorMessage("")
                                          }}
                                          className="px-6"
                                    >
                                          Back
                                    </Button>
                              </div>
                        </div>
                  )}
            </>
      )
}
