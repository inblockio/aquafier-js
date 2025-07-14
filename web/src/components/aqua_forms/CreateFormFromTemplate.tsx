import React, { useState } from 'react'
import { FormField, FormTemplate } from './types'
import { useStore } from 'zustand'
import appStore from '@/store'
import { isValidEthereumAddress, getRandomNumber, formatDate, estimateFileSize, dummyCredential, fetchSystemFiles } from '@/utils/functions'
import Aquafier, { AquaTree, FileObject, getAquaTreeFileName, AquaTreeWrapper, getAquaTreeFileObject } from 'aqua-js-sdk'
import axios from 'axios'
import { generateNonce } from 'siwe'
import { toast } from 'sonner'

// Shadcn UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, FileText, Image, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'

// const CreateFormFromTemplate = ({ selectedTemplate, callBack, openCreateTemplatePopUp = false }: { selectedTemplate: FormTemplate, callBack: () => void, openCreateTemplatePopUp: boolean }) => {
const CreateFormFromTemplate = ({ selectedTemplate, callBack }: { selectedTemplate: FormTemplate, callBack: () => void, openCreateTemplatePopUp: boolean }) => {
    const [submittingTemplateData, setSubmittingTemplateData] = useState(false)
    const [modalFormErorMessae, setModalFormErorMessae] = useState("");
    const { session, backend_url, systemFileInfo, setSystemFileInfo, setFiles } = useStore(appStore)
    const [formData, setFormData] = useState<Record<string, string | File | number>>({});
    const [multipleAddresses, setMultipleAddresses] = useState<string[]>([])

    const navigate = useNavigate()

    const getFieldDefaultValue = (field: FormField, currentState: any) => {
        if (field.type === "number") {
            return currentState ?? 0
        }
        if (field.type === "date") {

            return new Date().toISOString()
        }
        if (field.type === "text") {
            return currentState ?? ""
        }
        if (field.type === "file") {
            return currentState ?? null
        }
        if (field.type === "wallet_address") {

            return currentState ?? session?.address ?? ""
        }
        return ""
    }

    const reorderInputFields = (fields: FormField[]) => {
        const sortedFields = fields.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        // Return a new array with fields ordered by name
        return sortedFields;
    }


    const addAddress = () => {
        // if (multipleAddresses.length === 0 && session?.address) {
        //     setMultipleAddresses([...multipleAddresses, session.address, ""])
        // } else {
        setMultipleAddresses([...multipleAddresses, ""])
        // }
    }

    const removeAddress = (index: number) => {
        setMultipleAddresses(multipleAddresses.filter((_, i) => i !== index))
    }



    const shareAquaTree = async (aquaTree: AquaTree, recipientWalletAddress: string) => {


        try {
            let recipients: string[] = []
            if (recipientWalletAddress.includes(",")) {
                recipients = recipientWalletAddress.split(",")
                    .map((address) => address.trim())
                    .filter((address) => address !== session?.address.trim())
            } else {
                // Only add the recipient if it's not the logged-in user
                if (recipientWalletAddress.trim() !== session?.address.trim()) {
                    recipients = [recipientWalletAddress.trim()]
                } else {
                    recipients = []
                }
            }

            for (let recipient of recipients) {
                const unique_identifier = `${Date.now()}_${generateNonce()}`
                // let genesisHash = getGenesisHash(aquaTree)

                let allHashes = Object.keys(aquaTree.revisions);
                let genesisHash = allHashes[0];
                let latestHash = allHashes[allHashes.length - 1]

                let url = `${backend_url}/share_data`;
                let method = "POST"
                let data = {
                    "latest": latestHash,
                    "genesis_hash": genesisHash,
                    "hash": unique_identifier,
                    "recipient": recipient,
                    "option": "latest"
                }



                const response = await axios({
                    method,
                    url,
                    data,
                    headers: {
                        'nonce': session?.nonce
                    }
                });

                console.log(`Response from share request  ${response.status}`)
            }
        } catch (e) {

            toast.error("Error sharing workflow");
        }
    }

    const saveAquaTree = async (aquaTree: AquaTree, fileObject: FileObject, isFinal: boolean = false, isWorkflow: boolean = false) => {
        try {
            const url = `${backend_url}/explorer_aqua_file_upload`;

            // Create a FormData object to send multipart data
            let formData = new FormData();

            // Add the aquaTree as a JSON file
            const aquaTreeBlob = new Blob([JSON.stringify(aquaTree)], { type: 'application/json' });
            formData.append('file', aquaTreeBlob, fileObject.fileName);

            // Add the account from the session
            formData.append('account', session?.address || '');
            formData.append('is_workflow', `${isWorkflow}`);


            //workflow specifi
            if (selectedTemplate?.name == 'user_signature') {
                formData.append('template_id', `${selectedTemplate.id}`);
            }

            // Check if we have an actual file to upload as an asset
            if (fileObject.fileContent) {
                // Set has_asset to true
                formData.append('has_asset', 'true');

                // FIXED: Properly handle the file content as binary data
                // If fileContent is already a Blob or File object, use it directly
                if (fileObject.fileContent instanceof Blob || fileObject.fileContent instanceof File) {
                    formData.append('asset', fileObject.fileContent, fileObject.fileName);
                }
                // If it's an ArrayBuffer or similar binary data
                else if (fileObject.fileContent instanceof ArrayBuffer ||
                    fileObject.fileContent instanceof Uint8Array) {
                    const fileBlob = new Blob([fileObject.fileContent], { type: 'application/octet-stream' });
                    formData.append('asset', fileBlob, fileObject.fileName);
                }
                // If it's a base64 string (common for image data)
                else if (typeof fileObject.fileContent === 'string' && fileObject.fileContent.startsWith('data:')) {
                    // Convert base64 to blob
                    const response = await fetch(fileObject.fileContent);
                    const blob = await response.blob();
                    formData.append('asset', blob, fileObject.fileName);
                }
                // Fallback for other string formats (not recommended for binary files)
                else if (typeof fileObject.fileContent === 'string') {
                    const fileBlob = new Blob([fileObject.fileContent], { type: 'text/plain' });
                    formData.append('asset', fileBlob, fileObject.fileName);
                }
                // If it's something else (like an object), stringify it (not recommended for files)
                else {
                    console.warn('Warning: fileContent is not in an optimal format for file upload');
                    const fileBlob = new Blob([JSON.stringify(fileObject.fileContent)], { type: 'application/json' });
                    formData.append('asset', fileBlob, fileObject.fileName);
                }

            } else {
                formData.append('has_asset', 'false');
            }

            const response = await axios.post(url, formData, {
                headers: {
                    "nonce": session?.nonce,
                    // Don't set Content-Type header - axios will set it automatically with the correct boundary
                }
            });

            if (response.status === 200 || response.status === 201) {
                if (isFinal) {
                    setFiles(response.data.files);
                    toast.success("Aqua tree created successfully");
                    callBack && callBack()
                    navigate("/")
                    setModalFormErorMessae("")
                    setFormData({})
                    setSubmittingTemplateData(false);
                }
            }

        } catch (error) {
            setSubmittingTemplateData(false);
            toast.error("Error uploading aqua tree");
        }
    };

    const createWorkflowFromTemplate = async (e: React.FormEvent) => {
        e.preventDefault();

        try {

            setModalFormErorMessae("")

            if (submittingTemplateData) {
                toast.info("Data submission not completed, try again after some time.")
                return
            }
            setSubmittingTemplateData(true);

            // Ensure all fields have values before validation
            const completeFormData = { ...formData };
            selectedTemplate!.fields.forEach(field => {
                if (!field.is_array && !(field.name in completeFormData)) {
                    completeFormData[field.name] = getFieldDefaultValue(field, undefined);
                } else {
                    if (field.name === "signers" && selectedTemplate.name === "aqua_sign") {
                        completeFormData[field.name] = multipleAddresses.join(",");
                    }
                }
            });

            // Update formData with complete data
            setFormData(completeFormData);

            for (let fieldItem of selectedTemplate!.fields) {
                let valueInput = completeFormData[fieldItem.name]
                if (fieldItem.required && valueInput == undefined) {
                    setSubmittingTemplateData(false);
                    setModalFormErorMessae(`${fieldItem.name} is mandatory`)
                    return
                }

                if (fieldItem.type === 'wallet_address') {
                    if (typeof valueInput === 'string') {
                        if (valueInput.includes(",")) {
                            let walletAddresses = valueInput.split(",");
                            let seenWalletAddresses = new Set<string>();
                            for (let walletAddress of walletAddresses) {
                                let isValidWalletAddress = isValidEthereumAddress(walletAddress.trim())
                                if (!isValidWalletAddress) {
                                    setModalFormErorMessae(`>${walletAddress.trim()}< is not a valid wallet adress`)

                                    setSubmittingTemplateData(false);
                                    return
                                }
                                if (seenWalletAddresses.has(walletAddress.trim())) {
                                    setModalFormErorMessae(`>${walletAddress.trim()}< is a duplicate wallet adress`)

                                    setSubmittingTemplateData(false);
                                    return
                                }
                                seenWalletAddresses.add(walletAddress.trim())
                            }
                        } else {
                            let isValidWalletAddress = isValidEthereumAddress(valueInput.trim())
                            if (!isValidWalletAddress) {

                                setSubmittingTemplateData(false);
                                setModalFormErorMessae(`>${valueInput}< is not a valid wallet adress`)
                                return
                            }
                        }
                    } else {

                        setSubmittingTemplateData(false);
                        setModalFormErorMessae(`${valueInput} provided at ${fieldItem.name} is not a string`)
                        return
                    }
                }

            }


            let allSystemFiles = systemFileInfo
            if (systemFileInfo.length == 0) {
                
                const url3 = `${backend_url}/system/aqua_tree`;
                const systemFiles = await fetchSystemFiles(url3, session?.address || '')
                setSystemFileInfo(systemFiles)
                allSystemFiles = systemFiles

            }

            if (allSystemFiles.length == 0) {
                setSubmittingTemplateData(false);
                toast.error("Aqua tree for templates not found")
                return
            }


            let templateApiFileInfo = allSystemFiles.find((e) => {
                let nameExtract = getAquaTreeFileName(e!.aquaTree!);
                let selectedName = `${selectedTemplate?.name}.json`
                console.log(`nameExtract ${nameExtract} == selectedName ${selectedName}`)
                return nameExtract == selectedName
            })
            if (!templateApiFileInfo) {

                setSubmittingTemplateData(false);
                toast.error(`Aqua tree for ${selectedTemplate?.name} not found`)
                return
            }

            let aquafier = new Aquafier();
            const filteredData: Record<string, string | number> = {};

            console.log(`completeFormData ${JSON.stringify(completeFormData, null, 4)}`)
            const jsonString = JSON.stringify(completeFormData, null, 4);
            const randomNumber = getRandomNumber(100, 1000);
            console.log(`completeFormData -- jsonString-- ${jsonString}`)


            let fileName = `${selectedTemplate?.name ?? "template"}-${randomNumber}.json`;

            if (selectedTemplate?.name == "aqua_sign") {
                const theFile = completeFormData['document'] as File


                // Get filename without extension and the extension separately
                const fileNameWithoutExt = theFile.name.substring(0, theFile.name.lastIndexOf('.'));
                // console.log(`name ${fileNameWithoutExt}`)
                // console.log(`===============================================`)
                // throw Error(`fix me`)

                // const fileExtension = theFile.name.substring(theFile.name.lastIndexOf('.'));

                fileName = fileNameWithoutExt + '-' + formatDate(new Date()) + '-' + randomNumber + ".json";
            }


            const epochTimeInSeconds = Math.floor(Date.now() / 1000);
            // console.log(epochTimeInSeconds);
            Object.entries(completeFormData).forEach(([key, value]) => {
                // Only include values that are not File objects
                if (!(value instanceof File)) {
                    filteredData[key] = value;
                } else {
                    filteredData[key] = value.name;
                }
            });

            //for uniquness of the form
            completeFormData['created_at'] = epochTimeInSeconds;

            let estimateize = estimateFileSize(JSON.stringify(completeFormData));



            const fileObject: FileObject = {
                fileContent: jsonString,
                fileName: fileName,
                path: './',
                fileSize: estimateize
            }
            let genesisAquaTree = await aquafier.createGenesisRevision(fileObject, true, false, false)

            if (genesisAquaTree.isOk()) {

                console.log(`genesis ${JSON.stringify(genesisAquaTree.data.aquaTree!!, null, 4)}`)
                // create a link revision with the systems aqua tree 
                let mainAquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: genesisAquaTree.data.aquaTree!!,
                    revision: "",
                    fileObject: fileObject
                }
                let linkedAquaTreeFileObj = getAquaTreeFileObject(templateApiFileInfo);

                if (!linkedAquaTreeFileObj) {

                    setSubmittingTemplateData(false);
                    toast.error("system Aqua tee has error")
                    return
                }
                let linkedToAquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: templateApiFileInfo.aquaTree!!,
                    revision: "",
                    fileObject: linkedAquaTreeFileObj
                }
                let linkedAquaTreeResponse = await aquafier.linkAquaTree(mainAquaTreeWrapper, linkedToAquaTreeWrapper)

                if (linkedAquaTreeResponse.isErr()) {

                    setSubmittingTemplateData(false);
                    toast.error("Error linking aqua tree")
                    return
                }

                let aquaTreeData = linkedAquaTreeResponse.data.aquaTree!!

                let containsFileData = selectedTemplate?.fields.filter((e) => e.type == "file" || e.type == "image" || e.type == "document")
                if (containsFileData && containsFileData.length > 0) {

                    // for (let index = 0; index < containsFileData.length; index++) {
                    //     const element = containsFileData[index];
                    //     const file: File = formData[element['name']] as File

                    // Create an array to store all file processing promises
                    const fileProcessingPromises = containsFileData.map(async (element) => {
                        const file: File = completeFormData[element.name] as File;

                        // Check if file exists
                        if (!file) {
                            console.warn(`No file found for field: ${element.name}`);
                            return null;
                        }

                        try {
                            // Convert File to Uint8Array
                            const arrayBuffer = await file.arrayBuffer();
                            const uint8Array = new Uint8Array(arrayBuffer);

                            // Create the FileObject with properties from the File object
                            const fileObjectPar: FileObject = {
                                fileContent: uint8Array,
                                fileName: file.name,
                                path: "./",
                                fileSize: file.size
                            };

                            return fileObjectPar;
                            // After this you can use fileObjectPar with aquafier.createGenesisRevision() or other operations
                        } catch (error) {
                            console.error(`Error processing file ${file.name}:`, error);

                            toast.error(`Error processing file ${file.name}`)
                            setSubmittingTemplateData(false);
                            return null;
                        }
                    });

                    // Wait for all file processing to complete
                    try {
                        const fileObjects = await Promise.all(fileProcessingPromises);
                        // Filter out null results (from errors)
                        const validFileObjects = fileObjects.filter(obj => obj !== null) as FileObject[];

                        // Now you can use validFileObjects
                        console.log(`Processed ${validFileObjects.length} files successfully`);

                        // Example usage with each file object:
                        for (let item of validFileObjects) {
                            let aquaTreeResponse = await aquafier.createGenesisRevision(item)

                            if (aquaTreeResponse.isErr()) {
                                console.error("Error linking aqua tree:", aquaTreeResponse.data.toString());

                                setSubmittingTemplateData(false);
                                toast.error("Error linking aqua tree")
                                return
                            }
                            // upload the single aqua tree 
                            await saveAquaTree(aquaTreeResponse.data.aquaTree!!, item, false, true)

                            // linke it to main aqua tree
                            const aquaTreeWrapper: AquaTreeWrapper = {
                                aquaTree: aquaTreeData,
                                revision: "",
                                fileObject: fileObject
                            }

                            const aquaTreeWrapper2: AquaTreeWrapper = {
                                aquaTree: aquaTreeResponse.data.aquaTree!!,
                                revision: "",
                                fileObject: item
                            }

                            let res = await aquafier.linkAquaTree(aquaTreeWrapper, aquaTreeWrapper2)
                            if (res.isErr()) {
                                console.error("Error linking aqua tree:", aquaTreeResponse.data.toString());

                                setSubmittingTemplateData(false);
                                toast.error("Error linking aqua tree")
                                return
                            }
                            aquaTreeData = res.data.aquaTree!!

                        }

                    } catch (error) {
                        console.error("Error processing files:", error);

                        setSubmittingTemplateData(false);
                        toast.error("Error proceessing files")
                        return
                    }

                }
                const aquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: aquaTreeData,
                    revision: "",
                    fileObject: fileObject
                }

                // sign the aqua chain
                let signRes = await aquafier.signAquaTree(aquaTreeWrapper, "metamask", dummyCredential())

                if (signRes.isErr()) {
                    setSubmittingTemplateData(false);
                    toast.error("Error signing failed")
                    return
                } else {
                    console.log("signRes.data", signRes.data)
                    fileObject.fileContent = completeFormData
                    await saveAquaTree(signRes.data.aquaTree!!, fileObject, true)


                    //check if aqua sign 
                    if (selectedTemplate && selectedTemplate.name === "aqua_sign" && session?.address) {
                        if (completeFormData['signers'] != session?.address) {

                            await shareAquaTree(signRes.data.aquaTree!!, completeFormData['signers'] as string)

                        }
                    }

                }

            } else {
                setSubmittingTemplateData(false);

                toast.error("Error creating Aqua tree from template", {
                    description: 'Error creating Aqua tree from template',
                    duration: 5000,
                });
            }
        }
        catch (error: any) {

            setSubmittingTemplateData(false);
            toast.error("Error creating Aqua tree from template", {
                description: error?.message ?? 'Unknown error',
                duration: 5000,
            });
        }
    }

    const getFieldIcon = (type: string) => {
        switch (type) {
            case 'document':
                return <FileText className="h-4 w-4" />;
            case 'image':
                return <Image className="h-4 w-4" />;
            case 'file':
                return <Upload className="h-4 w-4" />;
            default:
                return null;
        }
    };

    const onBack = () => {
        navigate("/templates")
        callBack && callBack()
    }

    return (
        <>
            {/* <div className="w-full px-2">
            <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">
                    {selectedTemplate ? `Create ${selectedTemplate.title} Aqua Tree` : 'Create Form from template'}
                </h2>
            </div>
            <form onSubmit={createWorkflowFromTemplate} id="create-aqua-tree-form" className="space-y-6">
                {modalFormErorMessae.length > 0 && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{modalFormErorMessae}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4 mb-10">
                    {selectedTemplate ? reorderInputFields(selectedTemplate.fields).map((field, fieldIndex) => {
                        const isFileInput = field.type === 'file' || field.type === 'image' || field.type === 'document';

                        if (field.is_array) {
                            return (
                                <div key={`field-${fieldIndex}`} className="space-y-2">
                                    <div className="flex items-end justify-between">
                                        <Label className="text-lg">{field.label}</Label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type='button'
                                            className="rounded-lg"
                                            onClick={addAddress}
                                            data-testid={`multiple_values_${field.name}`}
                                        >
                                            <LuPlus className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {multipleAddresses.map((address, index) => (
                                        <div key={`address-${index}`} className="flex items-end space-x-2">
                                            <div className="flex-1">
                                                <div className="flex w-full items-center">
                                                    <span className="text-lg mr-2">{index + 1}. </span>
                                                    <div className="flex-1">
                                                        <Input
                                                            data-testid={`input-${field.name}-${index}`}
                                                            className="rounded-lg"
                                                            value={address}
                                                            onChange={(ev) => {
                                                                const newData = multipleAddresses.map((e, i) => {
                                                                    if (i === index) {
                                                                        return ev.target.value;
                                                                    }
                                                                    return e;
                                                                });
                                                                setMultipleAddresses(newData);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => removeAddress(index)}
                                            >
                                                <LuTrash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            );
                        }

                        return (
                            <div key={`field-${fieldIndex}`} className="space-y-2">
                                <Label htmlFor={`input-${field.name}`}>{field.label}</Label>
                                <Input
                                    id={`input-${field.name}`}
                                    data-testid={`input-${field.name}`}
                                    className="rounded-md"
                                    {...(!isFileInput ? { defaultValue: getFieldDefaultValue(field, formData[field.name]) } : {})}
                                    type={field.type === 'image' || field.type === 'document' ? 'file' : field.type}
                                    required={field.required}
                                    onChange={(e) => {
                                        // setFormData({
                                        //     ...formData,
                                        //     [field.name]: e.target.value
                                        // })

                                        if (selectedTemplate?.name == "aqua_sign" && field.name.toLowerCase() == "sender") {
                                            toast.info("Aqua Sign sender cannot be changed");
                                            return
                                        }
                                        if (field.type == 'image') {
                                            const files: File | FileList | null = e?.target?.files;

                                            if (!files || files.length === 0) {
                                                return;
                                            }

                                            const file = files[0]
                                            if (file && file.type.startsWith('image/')) {
                                                // Valid image file
                                                console.log("Valid ")
                                            } else {
                                                // Invalid file type
                                                alert('Please select an image file');
                                                e.target.value = ''; // Clear the input
                                                return
                                            }
                                        }

                                        if (field.type == 'document') {
                                            const files: File | FileList | null = e?.target?.files;

                                            if (!files || files.length === 0) {
                                                return;
                                            }

                                            const file = files[0]
                                            if (file && file.type === 'application/pdf') {
                                                // Valid PDF file
                                                console.log("Valid PDF")
                                            } else {
                                                // Invalid file type
                                                alert('Please select a PDF file');
                                                e.target.value = ''; // Clear the input
                                                return
                                            }
                                        }
                                        const value = isFileInput && e.target.files
                                            ? e.target.files[0] // Get the file object
                                            : e.target.value;   // Get the input value

                                        setFormData({
                                            ...formData,
                                            [field.name]: value
                                        });
                                    }}
                                />
                            </div>
                        );
                    }) : null}
                </div>

                <div className="flex justify-end space-x-4">
                    {selectedTemplate && (
                        <Button
                            data-testid="action-loading-create-button"
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={createWorkflowFromTemplate}
                            form="create-aqua-tree-form"
                            disabled={submittingTemplateData}
                        >
                            {submittingTemplateData ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    Loading
                                </>
                            ) : (
                                <span>Create</span>
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </div> */}
            {/* <div className="min-h-[100%] bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4"> */}
            <div className="min-h-[100%] px-2 sm:px-4">
                <div className="max-w-full sm:max-w-4xl mx-auto py-4 sm:py-6">
                    {/* Header */}
                    <div className="mb-8">
                        {/* <Button
                            variant="ghost"
                            onClick={onBack}
                            className={cn("mb-4 hover:bg-blue-50 cursor-pointer", openCreateTemplatePopUp ? "hidden" : "")}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Templates
                        </Button> */}

                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                                    Create {selectedTemplate?.title} Workflow
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Set up a new document signing workflow with multiple signers
                                </p>
                            </div>
                        </div>

                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Template: {selectedTemplate?.name}
                        </Badge>
                    </div>
                    <div className='pt-10'>


                        {/* Main Form Card */}
                        {/* <Card className="shadow-md border-0 bg-white/80 backdrop-blur-sm">
                        <CardHeader className="pb-6">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <FileText className="h-5 w-5 text-blue-600" />
                                Template Configuration
                            </CardTitle>
                        </CardHeader>

                        <CardContent> */}
                        <form onSubmit={createWorkflowFromTemplate} id="create-aqua-tree-form" className="space-y-8">
                            {modalFormErorMessae.length > 0 && (
                                <Alert variant="destructive" className="border-red-200 bg-red-50">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{modalFormErorMessae}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-4 sm:space-y-6">
                                {selectedTemplate ? reorderInputFields(selectedTemplate.fields).map((field, fieldIndex) => {
                                    const isFileInput = field.type === 'file' || field.type === 'image' || field.type === 'document';

                                    if (field.is_array) {
                                        return (
                                            <div key={`field-${fieldIndex}`} className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Label className="text-base sm:text-lg font-medium text-gray-900">
                                                            {field.label}
                                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                                        </Label>
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            Add multiple wallet addresses for document signers
                                                        </p>
                                                    </div>
                                                    <Button

                                                        variant="outline"
                                                        size="sm"
                                                        type="button"
                                                        className="rounded-lg hover:bg-blue-50 hover:border-blue-300"
                                                        onClick={addAddress}
                                                        data-testid={`multiple_values_${field.name}`}
                                                    >
                                                        <Plus className="h-4 w-4 mr-1" />
                                                        Add Signer
                                                    </Button>
                                                </div>

                                                <div className="space-y-3">
                                                    {multipleAddresses.map((address, index) => (
                                                        <div key={`address-${index}`} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-4 bg-gray-50 rounded-lg border">
                                                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-medium text-sm">
                                                                {index + 1}
                                                            </div>
                                                            <div className="flex-1">
                                                                <Input
                                                                    data-testid={`input-${field.name}-${index}`}
                                                                    className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                                                    placeholder="Enter signer wallet address"
                                                                    type="text"
                                                                    value={address}
                                                                    onChange={(ev) => {
                                                                        const newData = multipleAddresses.map((e, i) => {
                                                                            if (i === index) {
                                                                                return ev.target.value;
                                                                            }
                                                                            return e;
                                                                        });
                                                                        setMultipleAddresses(newData);
                                                                    }}
                                                                />
                                                            </div>
                                                            {multipleAddresses.length > 1 && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    type="button"
                                                                    className="rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                                                                    onClick={() => removeAddress(index)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
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

                                            {field.type === 'text' ? (
                                                <Input
                                                    id={`input-${field.name}`}
                                                    data-testid={`input-${field.name}`}
                                                    className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
                                                    placeholder="Type here..."
                                                    defaultValue={getFieldDefaultValue(field, formData[field.name])}
                                                    onChange={(e) => {
                                                        setFormData({
                                                            ...formData,
                                                            [field.name]: e.target.value
                                                        });
                                                    }}
                                                />
                                            ) : (
                                                <div className="relative">
                                                    <Input
                                                        id={`input-${field.name}`}
                                                        data-testid={`input-${field.name}`}
                                                        className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base h-9 sm:h-10"
                                                        {...(!isFileInput ? { defaultValue: getFieldDefaultValue(field, formData[field.name]) } : {})}
                                                        type={field.type === 'image' || field.type === 'document' ? 'file' : field.type}
                                                        required={field.required}
                                                        accept={field.type === 'document' ? '.pdf' : field.type === 'image' ? 'image/*' : undefined}
                                                        placeholder={
                                                            field.type === 'wallet_address' ? 'Enter wallet address' :
                                                                field.type === 'date' ? 'Select due date' :
                                                                    field.type === 'document' ? 'Upload PDF document' :
                                                                        `Enter ${field.label.toLowerCase()}`
                                                        }
                                                        onChange={(e) => {
                                                            if (selectedTemplate?.name === "aqua_sign" && field.name.toLowerCase() === "sender") {
                                                                // Show toast notification (would need toast implementation)
                                                                console.log("Aqua Sign sender cannot be changed");
                                                                return;
                                                            }

                                                            if (field.type === 'image') {
                                                                const files = e?.target?.files;
                                                                if (files && files.length > 0) {
                                                                    const file = files[0];
                                                                    if (!file.type.startsWith('image/')) {
                                                                        alert('Please select an image file');
                                                                        e.target.value = '';
                                                                        return;
                                                                    }
                                                                }
                                                            }

                                                            if (field.type === 'document') {
                                                                const files = e?.target?.files;
                                                                if (files && files.length > 0) {
                                                                    const file = files[0];
                                                                    if (file.type !== 'application/pdf') {
                                                                        alert('Please select a PDF file');
                                                                        e.target.value = '';
                                                                        return;
                                                                    }
                                                                }
                                                            }

                                                            const value = isFileInput && e.target.files
                                                                ? e.target.files[0]
                                                                : e.target.value;

                                                            setFormData({
                                                                ...formData,
                                                                [field.name]: value
                                                            });
                                                        }}
                                                    />
                                                    {isFileInput && (
                                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                            <Upload className="h-4 w-4 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {field.name === 'sender' && (
                                                <p className="text-xs text-gray-500">
                                                    This will be used as the sender email for the document workflow
                                                </p>
                                            )}
                                        </div>
                                    );
                                }) : null}
                            </div>

                            <Separator className="my-8" />

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-2 sm:space-x-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onBack}
                                    className="px-6"
                                >
                                    Cancel
                                </Button>
                                {selectedTemplate && (
                                    <Button
                                        data-testid="action-loading-create-button"
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                                        disabled={submittingTemplateData}
                                    >
                                        {submittingTemplateData ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating Workflow...
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="mr-2 h-4 w-4" />
                                                Create Workflow
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </form>
                        {/* </CardContent>
                    </Card> */}
                    </div>

                    {/* Help Section */}
                    {/* <Card className="mt-6 bg-blue-50/50 border-blue-200">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-blue-900 mb-1">Tips for creating workflows</h3>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• Ensure all signer email addresses are valid and accessible</li>
                                        <li>• Upload documents in PDF format for best compatibility</li>
                                        <li>• Set realistic due dates to allow sufficient time for signing</li>
                                        <li>• Include a clear message to help signers understand the document</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card> */}
                </div>
            </div>
        </>
    )
}

export default CreateFormFromTemplate