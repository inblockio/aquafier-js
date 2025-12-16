import { ApiFileInfo } from "@/models/FileInfo"
import appStore from "@/store"
import { FilesListProps } from "@/types/types"
import { getAquaTreeFileName } from "@/utils/functions"
import { useStore } from "zustand"
import FilesListItem from "./files_list_item"

interface IRenderFilesList {
    filteredFiles: ApiFileInfo[]
    filesListProps: FilesListProps
    view: 'table' | 'card',
    loading?: boolean
    systemAquaFileNames: string[]
}

export const RenderFilesList = ({ filteredFiles, filesListProps, view, loading = false, systemAquaFileNames }: IRenderFilesList) => {

    const { systemFileInfo, backend_url, session } = useStore(appStore)

    let hasUndefined = false
    for (let i = 0; i < filteredFiles.length; i++) {
        if (filteredFiles[i].aquaTree === undefined) {
            hasUndefined = true
            break
        }
        if (filteredFiles[i].aquaTree?.revisions === undefined) {
            hasUndefined = true
            break
        }
    }
    if (hasUndefined) {
        return <div>No files available.</div>
    }
    return <table className="w-full border-collapse">
        <thead>
            <tr className="bg-gray-50">
                {filesListProps.showCheckbox == true ? <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-12 rounded-tl-md"> </th> : null}
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-1/3 rounded-tl-md">Name</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-30">Type</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-40">Uploaded At</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-24">File Size</th>
                {filesListProps.showFileActions == true ? <th className="min-w-[370px] py-3 px-4 text-left text-sm font-medium text-gray-700 w-1/4 rounded-tr-md">Actions</th> : null}
            </tr>
        </thead>
        <tbody>
            {loading ? (
                <tr>
                    <td colSpan={5} className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                        <div className="flex items-center justify-center py-12">
                            <div className="text-gray-500">Loading...</div>
                        </div>
                    </td>
                </tr>
            ) : null}
            {
                !loading && filteredFiles.length === 0 ? (
                    <tr>
                    <td colSpan={5} className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                        <div className="flex items-center justify-center py-12">
                            <div className="text-gray-500">No files found</div>
                        </div>
                    </td>
                </tr>
                ) : null}
            {filteredFiles
                .map((file, index) => {
                    return (
                        <FilesListItem
                            showWorkFlowsOnly={false}
                            key={index}
                            index={index}
                            file={file}
                            systemFileInfo={systemFileInfo}
                            systemAquaFileNames={systemAquaFileNames}
                            backendUrl={backend_url}
                            nonce={session?.nonce ?? ''}
                            viewMode={view}
                            filesListProps={filesListProps}
                        />
                    )
                })}
        </tbody>
    </table>
}

export const RenderFilesListCard = ({ filteredFiles, filesListProps, view, systemAquaFileNames }: IRenderFilesList) => {
    const { systemFileInfo, backend_url, session } = useStore(appStore)
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFiles
            .map((file, index) => {
                return (
                    <FilesListItem
                        showWorkFlowsOnly={false}
                        key={`card-${index}`}
                        index={index}
                        file={file}
                        systemFileInfo={systemFileInfo}
                        systemAquaFileNames={systemAquaFileNames}
                        backendUrl={backend_url}
                        nonce={session?.nonce ?? ''}
                        viewMode={view}
                        filesListProps={filesListProps}
                    />
                )
            })}
    </div>
}