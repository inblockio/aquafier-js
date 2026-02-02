import { ApiFileInfo } from "@/models/FileInfo"
import appStore from "@/store"
import { GlobalPagination } from "@/types"
import { API_ENDPOINTS } from "@/utils/constants"
import { ensureDomainUrlHasSSL } from "@/utils/functions"
import axios from "axios"
import { useEffect, useState } from "react"
import { useStore } from "zustand"
import { RenderFilesList, RenderFilesListCard } from "./commons"
import { FilesListProps } from "@/types/types"
import CustomPagination from "@/components/common/CustomPagination"
import FilesListItem from "./files_list_item"
import { useReloadWatcher } from "@/hooks/useReloadWatcher"
import { RELOAD_KEYS, triggerWorkflowReload } from "@/utils/reloadDatabase"
import { useNotificationWebSocketContext } from "@/contexts/NotificationWebSocketContext"

interface IWorkflowSpecificTable {
    workflowName: string
    view: 'table' | 'card'
    filesListProps: FilesListProps
    isSmallScreen: boolean
    systemAquaFileNames: string[]
    sortBy: 'date' | 'name' | 'size'
} 

const WorkflowSpecificTable = ({ workflowName, view, filesListProps, isSmallScreen, systemAquaFileNames, sortBy }: IWorkflowSpecificTable) => {
 
    const { session, backend_url } = useStore(appStore)

    const [files, setFiles] = useState<ApiFileInfo[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [pagination, setPagination] = useState<GlobalPagination | null>(null)
    const [loading, setLoading] = useState(true)

    const { subscribe } = useNotificationWebSocketContext();

    const loadFiles = async () => {
        if (!session?.address || !backend_url || !workflowName) return;
        setFiles([])
        try {
            setLoading(true)

            // Determine if we should use the new sorted endpoint or the old per_type endpoint
            let endpoint = API_ENDPOINTS.SORTED_FILES
            let params: any = {
                page: currentPage,
                limit: 10,
                orderBy: sortBy,
            }

            // For specific workflow types (claims), use the old endpoint
            if (workflowName !== 'all' && workflowName !== 'user_files') {
                endpoint = API_ENDPOINTS.GET_PER_TYPE
                params.claim_types = JSON.stringify([workflowName])
            } else {
                // For 'all' and 'user_files', use the new sorted endpoint
                params.fileType = workflowName
            }

            const filesDataQuery = await axios.get(ensureDomainUrlHasSSL(`${backend_url}/${endpoint}`), {
                headers: {
                    'Content-Type': 'application/json',
                    'nonce': `${session!.nonce}`
                },
                params
            })
            const response = filesDataQuery.data
            const aquaTrees = response.aquaTrees
            setPagination(response.pagination)
            setFiles(aquaTrees)
            setLoading(false)
        } catch (error) {
            setFiles([])
            setLoading(false)
            console.log("Error loading files", error)
        }
    }

    useEffect(() => {
        setCurrentPage(1)
    }, [workflowName])

    useEffect(() => {
        loadFiles()
    }, [backend_url, JSON.stringify(session), `${currentPage}-${workflowName}`, sortBy]);

    // Determine the appropriate reload key based on workflow type
    const getReloadKey = (workflowName: string): string => {
        // Handle special cases for custom file views
        if (workflowName === 'all') {
            return RELOAD_KEYS.all_files;
        }
        if (workflowName === 'user_files') {
            return RELOAD_KEYS.user_files;
        }

        // For specific workflow types, use the workflow name as key if it exists in RELOAD_KEYS
        const reloadKey = (RELOAD_KEYS as any)[workflowName];
        if (reloadKey) {
            return reloadKey;
        }

        // Fallback to the workflow name itself
        return workflowName;
    };

    // Watch for reload triggers with dynamic key
    useReloadWatcher({
        key: getReloadKey(workflowName),
        onReload: async () => {
            await loadFiles();
        }
    });

    useEffect(() => {
        const unsubscribe = subscribe((message) => {
            if (message.type === 'notification_reload' && message.data && message.data.target === "workflows") {
                loadFiles()
                triggerWorkflowReload(RELOAD_KEYS.contacts);
            }
        });
        return unsubscribe;
    }, []);


    return (
        <div className="flex flex-col gap-4">
            {!filesListProps.showFileActions ? (
                <div className="overflow-x-auto md:h-[calc(100vh-330px)] overflow-y-auto">
                    <RenderFilesList
                        filteredFiles={files}
                        filesListProps={filesListProps}
                        view={view}
                        systemAquaFileNames={systemAquaFileNames}
                        loading={loading}
                    />
                </div>
            ) : (
                <>
                    {
                        isSmallScreen ? (
                            <div className="space-y-4">
                                {
                                    loading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="text-gray-500">Loading...</div>
                                        </div>
                                    ) : null
                                }
                                {!loading && files.length > 0 ? (
                                    files
                                        .map((file, index) => (
                                            <div key={`mobile-${index}`}>
                                                <FilesListItem
                                                    showWorkFlowsOnly={false}
                                                    // key={`mobile-item-${index}`}
                                                    index={index}
                                                    file={file}
                                                    systemFileInfo={[]}
                                                    backendUrl={backend_url}
                                                    nonce={session?.nonce ?? ''}
                                                    viewMode={'card'}
                                                    filesListProps={filesListProps}
                                                    systemAquaFileNames={systemAquaFileNames}
                                                />
                                            </div>
                                        ))
                                ) : null}
                                {!loading && files.length === 0 ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="text-gray-500">No files found</div>
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="overflow-x-auto md:h-[calc(100vh-330px)] overflow-y-auto">
                                {view === 'table' ? (
                                    <RenderFilesList
                                        filteredFiles={files}
                                        filesListProps={filesListProps}
                                        view={view}
                                        systemAquaFileNames={systemAquaFileNames}
                                        loading={loading}
                                    />
                                ) : (
                                    <RenderFilesListCard
                                        filteredFiles={files}
                                        filesListProps={filesListProps}
                                        view={view}
                                        loading={loading}
                                        systemAquaFileNames={systemAquaFileNames}
                                    />
                                )}
                            </div>

                        )
                    }
                </>
            )}
            <CustomPagination
                currentPage={currentPage}
                totalPages={pagination?.totalPages ?? 1}
                onPageChange={setCurrentPage}
                disabled={files.length === 0}
            />
        </div>
    )
}

export default WorkflowSpecificTable