"use client"

import type { ButtonProps, RecipeProps } from "@chakra-ui/react"
import {
  Box,
  Button,
  FileUpload as ChakraFileUpload,
  Group,
  Icon,
  Span,
  Text,
  useFileUploadContext,
  useRecipe,
} from "@chakra-ui/react"
import { forwardRef, useEffect, useState } from "react"
import { LuFile, LuUpload, LuX } from "react-icons/lu"
import { determineFileType, getFileName, isAquaTree, isJSONFile, isJSONKeyValueStringContent, isZipFile, readFileContent } from "../../utils/functions"
import React from "react"
import appStore from "../../store"
import { useStore } from "zustand"
import { toaster } from "./toaster"
import { maxUserFileSizeForUpload } from "../../utils/constants"
import { FormRevisionFile } from "../dropzone_file_actions/form_revision"
import { ImportAquaTree } from "../dropzone_file_actions/import_aqua_tree"
import { UploadFile } from "../dropzone_file_actions/upload_file"
import { ImportAquaTreeZip } from "../dropzone_file_actions/import_aqua_tree_zip"
// import ImportByModal from "../ImportByModal"

export interface FileUploadRootProps extends ChakraFileUpload.RootProps {
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

export const FileUploadRoot = forwardRef<HTMLInputElement, FileUploadRootProps>(
  function FileUploadRoot(props, ref) {
    const { children, inputProps, ...rest } = props
    return (
      <ChakraFileUpload.Root {...rest}>
        <ChakraFileUpload.HiddenInput ref={ref} {...inputProps} />
        {children}
      </ChakraFileUpload.Root>
    )
  },
)

export interface FileUploadDropzoneProps
  extends ChakraFileUpload.DropzoneProps {
  label: React.ReactNode
  description?: React.ReactNode
}

export const FileUploadDropzone = forwardRef<
  HTMLInputElement,
  FileUploadDropzoneProps
>(function FileUploadDropzone(props, ref) {
  const { children, label, description, ...rest } = props
  return (
    <ChakraFileUpload.Dropzone ref={ref} {...rest}>
      <Icon fontSize="xl" color="fg.muted">
        <Box>
          <LuUpload />
        </Box>
      </Icon>
      <ChakraFileUpload.DropzoneContent>
        <div>{label}</div>
        {description && <Text color="fg.muted">{description}</Text>}
      </ChakraFileUpload.DropzoneContent>
      {children}
    </ChakraFileUpload.Dropzone>
  )
})

interface VisibilityProps {
  showSize?: boolean
  clearable?: boolean
}

interface FileUploadItemProps extends VisibilityProps {
  file: File
  fileIndex: number
  uploadedIndexes: number[]
  updateUploadedIndex: (fileIndex: number) => void
}

const FileUploadItem = (props: FileUploadItemProps) => {
  const { file, showSize, clearable, fileIndex, uploadedIndexes, updateUploadedIndex } = props
  const isJson = isJSONFile(file.name)

  const isZIp = isZipFile(file.name)
  const [isJsonForm, setIsJsonForm] = useState<boolean>(false)
  const [isJsonAquaTreeData, setIsJsonAquaTreeData] = useState<boolean>(false)
  const { files } = useStore(appStore);
  useEffect(() => {
    const checkFileContent = async () => {
      if (isJson) {
        try {
          let content = await readFileContent(file);
          let contentStr = content as string
          let isForm = isJSONKeyValueStringContent(contentStr);
          if (isForm) {
            setIsJsonForm(true);
          }

          let jsonData = JSON.parse(contentStr);
            let isAquaTreeData = isAquaTree(jsonData);
            let r = typeof jsonData === 'object'
            let r2 = 'revisions' in jsonData
            let r3 = 'file_index' in jsonData
            console.log(`isAquaTreeData  ${isAquaTreeData} contentStr ${contentStr} r ${r} r2 ${r2} r3 ${r3}`)
            if (isAquaTreeData) {
              setIsJsonAquaTreeData(isAquaTreeData)
            }


        } catch (error) {
          console.error("Error reading file content:", error);
        }
      }
    };

    checkFileContent();
  }, [isJson, file]);

  // if file uploaded remove from file upload item
  if (uploadedIndexes.includes(fileIndex)) {
    return (<div></div>)
  }

  const showUploadIcon = () => {

    let totoalSize = 0;
    for (let fileItem of files) {
      let fileName = getFileName(fileItem.aquaTree!!)
      let size = fileItem.fileObject.find((e) => e.fileName == fileName);
      if (size) {
        totoalSize = size.fileSize ?? 0 + totoalSize
      }
    }

    totoalSize = totoalSize + file.size

    // console.log(`totoalSize ${totoalSize} -- maxUserFileSizeForUpload ${maxUserFileSizeForUpload}`)
    if (totoalSize >= maxUserFileSizeForUpload) {
      toaster.create({
        description: `Please obtain a licence to upload more file`,
        type: "info"
      })
      return;
    }

    if (isJson) {
      console.log(`isJson: ${isJsonForm}  99  isJsonAquaTreeData ${isJsonAquaTreeData}`)
      return <>



        <>
          {isJsonForm ? <FormRevisionFile file={file} fileIndex={fileIndex} uploadedIndexes={uploadedIndexes} updateUploadedIndex={updateUploadedIndex} autoUpload={false} /> : <></>}
        </>
        <>
          {isJsonAquaTreeData ? <ImportAquaTree aquaFile={file} fileIndex={fileIndex} uploadedIndexes={uploadedIndexes} updateUploadedIndex={updateUploadedIndex} autoUpload={false} /> : <></>}

        </>

        <>
          {isJsonForm == false && isJsonAquaTreeData == false ?
            <UploadFile file={file} fileIndex={fileIndex} uploadedIndexes={uploadedIndexes} updateUploadedIndex={updateUploadedIndex} autoUpload={false} />
            : <></>
          }
        </>

      </>
    }

    if (isZIp) {


      return <>
        <UploadFile file={file} fileIndex={fileIndex} uploadedIndexes={uploadedIndexes} updateUploadedIndex={updateUploadedIndex} autoUpload={false} />
        <ImportAquaTreeZip file={file} fileIndex={fileIndex} uploadedIndexes={uploadedIndexes} updateUploadedIndex={updateUploadedIndex} autoUpload={false} />
      </>
    }

    return <UploadFile file={file} fileIndex={fileIndex} uploadedIndexes={uploadedIndexes} updateUploadedIndex={updateUploadedIndex} autoUpload={true} />
  }


  return (
    <ChakraFileUpload.Item file={file}>
      <ChakraFileUpload.ItemPreview asChild>
        <Icon fontSize="lg" color="fg.muted">
          <Box>
            <LuFile />
          </Box>
        </Icon>
      </ChakraFileUpload.ItemPreview>

      {showSize ? (
        <ChakraFileUpload.ItemContent>
          <ChakraFileUpload.ItemName />
          <ChakraFileUpload.ItemSizeText />
        </ChakraFileUpload.ItemContent>
      ) : (
        <ChakraFileUpload.ItemName flex="1" />
      )}

      <Group>
        {showUploadIcon()}

        {(clearable || isJson || isZIp) && (
          <ChakraFileUpload.ItemDeleteTrigger asChild >

            <Button data-testid="delete-file-for-upload-button" size={'xs'} h={"32px"} colorPalette={'red'} variant={'subtle'} w={'80px'}>
              Delete
              <LuX />
            </Button>
          </ChakraFileUpload.ItemDeleteTrigger>
        )}
      </Group>

    </ChakraFileUpload.Item>
  )
}

interface FileUploadListProps
  extends VisibilityProps,
  ChakraFileUpload.ItemGroupProps {
  files?: File[]
}

export const FileUploadList = forwardRef<HTMLUListElement, FileUploadListProps>(
  function FileUploadList(props, ref) {
    const [processedFiles, setProcessedFiles] = useState<File[]>([])
    const [uploadedIndexes, setUploadedIndexes] = useState<number[]>([])
    const { showSize, clearable, files, ...rest } = props

    const fileUpload = useFileUploadContext()
    const acceptedFiles = files ?? fileUpload.acceptedFiles


    // Process files without extensions
    React.useEffect(() => {
      const processFiles = async () => {
        const processedFilesList = await Promise.all(
          acceptedFiles.map(async (file) => {
            // If the file doesn't have an extension, try to determine and rename it
            if (!file.name.includes('.')) {
              return await determineFileType(file);
            }
            return file;
          })
        );
        setProcessedFiles(processedFilesList);
      };

      if (acceptedFiles.length > 0) {
        processFiles();
      }
    }, [acceptedFiles]);



    const updateUploadedIndexes = (fileIndex: number) => {
      setUploadedIndexes(current => ([...current, fileIndex]))
    }


    if (acceptedFiles.length === 0) return null

    return (
      <ChakraFileUpload.ItemGroup ref={ref} {...rest}>
        {processedFiles.map((file, index: number) => (
          <FileUploadItem
            key={file.name}
            file={file}
            showSize={showSize}
            clearable={clearable}
            fileIndex={index}
            uploadedIndexes={uploadedIndexes}
            updateUploadedIndex={updateUploadedIndexes}
          />
        ))}
      </ChakraFileUpload.ItemGroup>
    )
  },
)

type Assign<T, U> = Omit<T, keyof U> & U

interface FileInputProps extends Assign<ButtonProps, RecipeProps<"input">> {
  placeholder?: React.ReactNode
}

export const FileInput = forwardRef<HTMLButtonElement, FileInputProps>(
  function FileInput(props, ref) {
    const inputRecipe = useRecipe({ key: "input" })
    const [recipeProps, restProps] = inputRecipe.splitVariantProps(props)
    const { placeholder = "Select file(s)", ...rest } = restProps
    return (
      <ChakraFileUpload.Trigger asChild>
        <Button
          data-testid="file-input-button"
          unstyled
          py="0"
          ref={ref}
          {...rest}
          css={[inputRecipe(recipeProps), props.css]}
        >
          <ChakraFileUpload.Context>
            {({ acceptedFiles }) => {
              if (acceptedFiles.length === 1) {
                return <span>{acceptedFiles[0].name}</span>
              }
              if (acceptedFiles.length > 1) {
                return <span>{acceptedFiles.length} files</span>
              }
              return <Span color="fg.subtle">{placeholder}</Span>
            }}
          </ChakraFileUpload.Context>
        </Button>
      </ChakraFileUpload.Trigger>
    )
  },
)

export const FileUploadLabel = ChakraFileUpload.Label
export const FileUploadClearTrigger = ChakraFileUpload.ClearTrigger
export const FileUploadTrigger = ChakraFileUpload.Trigger
