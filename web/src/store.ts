import { IDBPDatabase, openDB } from 'idb'
import { createStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { ApiFileInfo } from './models/FileInfo'
import { ApiFileData, ApiFileInfoState, emptyUserStats, IUserStats, OpenDialog, Session, WebConfig } from './types/types'
import { FormTemplate } from './components/aqua_forms/types'
import { ensureDomainUrlHasSSL } from './utils/functions'
import { USER_PROFILE_DEFAULT } from './utils/constants'

type AppStoreState = {
      user_profile: {
            user_pub_key: string
            cli_pub_key: string
            cli_priv_key: string
            witness_network: string
            alchemy_key: string
            theme: string
            ens_name: string
            enable_dba_claim: boolean
            witness_contract_address: string | null
            User?: {
                  address: string
                  ens_name: string
                  email: string
            }
      }
      session: Session | null
      isAdmin: boolean
      files: ApiFileInfoState,
      filesStats: IUserStats,
      workflows: ApiFileInfoState,
      webConfig: WebConfig,
      workSpaceDowload: {
            fileName: string,
            fileIndex: number,
            totalFiles: number
      },

      apiFileData: ApiFileData[]
      systemFileInfo: ApiFileInfo[]
      formTemplates: FormTemplate[]
      selectedFileInfo: ApiFileInfo | null
      openDialog: OpenDialog | null
      // openFilesDetailsPopUp: boolean | null
      // openCreateTemplatePopUp: boolean | null
      // openCreateAquaSignPopUp: boolean | null
      // openCreateClaimPopUp: boolean | null
      // openCreateClaimAttestationPopUp: boolean | null
      metamaskAddress: string | null
      avatar: string | undefined
      backend_url: string
      contracts: any[]
}

type AppStoreActions = {
      setUserProfile: (config: AppStoreState['user_profile']) => void
      setSession: (config: AppStoreState['session']) => void
      setIsAdmin: (isAdmin: boolean) => void
      setMetamaskAddress: (address: AppStoreState['metamaskAddress']) => void
      setAvatar: (avatar: AppStoreState['avatar']) => void
      setFiles: (files: AppStoreState['files']) => void
      setFilesStats: (files: AppStoreState['filesStats']) => void
      setWorkflows: (workflows: AppStoreState['workflows']) => void
      setWebConfig: (config: AppStoreState['webConfig']) => void
      setWorkSpaceDowload: (config: AppStoreState['workSpaceDowload']) => void
      setSelectedFileInfo: (file: ApiFileInfo | null) => void

      setOpenDialog: (state: OpenDialog | null) => void
      // setOpenFileDetailsPopUp: (state: boolean | null) => void
      // setOpenCreateTemplatePopUp: (state: boolean | null) => void
      // setOpenCreateAquaSignPopUp: (state: boolean | null) => void
      // setOpenCreateClaimPopUp: (state: boolean | null) => void
      // setOpenCreateClaimAttestationPopUp: (state: boolean | null) => void

      addFile: (file: ApiFileInfo) => void
      setApiFileData: (apiFileData: ApiFileData[]) => void
      setSystemFileInfo: (systemFileInfo: ApiFileInfo[]) => void
      setFormTemplate: (apiFileData: FormTemplate[]) => void
      setContracts: (contracts: any[]) => void
      setBackEndUrl: (backend_url: AppStoreState['backend_url']) => void
      resetState: () => void
}

type TAppStore = AppStoreState & AppStoreActions

// Create a singleton promise for the database to prevent multiple upgrade attempts
let dbPromiseInstance: Promise<IDBPDatabase> | null = null

const getDbPromise = () => {
      if (!dbPromiseInstance) {
            dbPromiseInstance = openDB('aquafier-db', 2, {
                  upgrade(db, _oldVersion, _newVersion, _transaction) {
                        // Handle version upgrades properly
                        if (!db.objectStoreNames.contains('store')) {
                              db.createObjectStore('store')
                        }
                  },

                  // Add blocking handler to prevent version conflicts
                  blocked() {
                        console.warn('Database upgrade blocked by another connection')
                        // Optionally notify user or handle the blocking situation
                  },

                  // Add blocking handler for close events
                  blocking() {
                        console.warn('Database needs to close for upgrade')
                        // Optionally notify user or handle the blocking situation
                  },
            }).catch(error => {
                  console.error('Database opening error:', error)
                  dbPromiseInstance = null // Reset on error to allow retry
                  throw error
            })
      }
      return dbPromiseInstance
}

// Custom storage object for Zustand using IndexedDB
const indexedDBStorage = {
      getItem: async (name: string) => {
            try {
                  const db = await getDbPromise()
                  return (await db.get('store', name)) || null
            } catch (error) {
                  console.error('Error getting item from IndexedDB:', error)
                  return null
            }
      },
      setItem: async (name: string, value: string) => {
            try {
                  const db = await getDbPromise()
                  await db.put('store', value, name)
            } catch (error) {
                  console.error('Error setting item in IndexedDB:', error)
                  throw error
            }
      },
      removeItem: async (name: string) => {
            try {
                  const db = await getDbPromise()
                  await db.delete('store', name)
            } catch (error) {
                  console.error('Error removing item from IndexedDB:', error)
                  throw error
            }
      },
}

export const INITIAL_STATE: AppStoreState = {
      user_profile: USER_PROFILE_DEFAULT,
      session: null,
      isAdmin: false,
      files: {
            fileData: [],
            status: 'idle',
      },
      filesStats: emptyUserStats,
      workflows: {
            fileData: [],
            status: 'idle',
      },
      selectedFileInfo: null,
      webConfig: {
            CUSTOM_LANDING_PAGE_URL: false,
            CUSTOM_LOGO_URL: false,
            SENTRY_DSN: undefined,
            BACKEND_URL: undefined,
            AUTH_PROVIDER: undefined,
            DEFAULT_PAYMENT_METHOD: "CRYPTO",
            ENABLE_CRYPTO_PAYMENTS: true,
            ENABLE_STRIPE_PAYMENTS: false,
      },
      workSpaceDowload: {
            fileName: '',
            fileIndex: 0,
            totalFiles: 0
      },
      openDialog: null, // Initialize openDialog state
      // openFilesDetailsPopUp: false,
      // openCreateTemplatePopUp: false,
      // openCreateAquaSignPopUp: false,
      // openCreateClaimPopUp: false,
      // openCreateClaimAttestationPopUp: false,
      metamaskAddress: null,
      avatar: '',
      apiFileData: [],
      systemFileInfo: [],
      formTemplates: [],
      backend_url: 'http://0.0.0.0:3000',
      contracts: [],
}


const appStore = createStore<TAppStore>()(
      persist(
            set => ({
                  // Initial state
                  ...INITIAL_STATE,

                  // Actions
                  setUserProfile: config => set({ user_profile: config }),
                  setSession: session => set({ session: session }),
                  setIsAdmin: (isAdmin: boolean) => set({ isAdmin: isAdmin }),
                  setMetamaskAddress: (address: AppStoreState['metamaskAddress']) => set({ metamaskAddress: address }),
                  setAvatar: (avatar: AppStoreState['avatar']) => set({ avatar: avatar }),
                  setFiles: (files: AppStoreState['files']) => set({ files: files }),
                  setFilesStats: (filesStats: AppStoreState['filesStats']) => set({ filesStats: filesStats }),
                  setWorkflows: (workflows: AppStoreState['workflows']) => set({ workflows: workflows }),
                  setSelectedFileInfo: (file: ApiFileInfo | null) => set({ selectedFileInfo: file }),

                  setOpenDialog: (state: OpenDialog | null) => set({ openDialog: state }),
                  // setOpenFileDetailsPopUp: (state: boolean | null) => set({ openFilesDetailsPopUp: state }),
                  // setOpenCreateTemplatePopUp: (state: boolean | null) => set({ openCreateTemplatePopUp: state }),
                  // setOpenCreateAquaSignPopUp: (state: boolean | null) => set({ openCreateAquaSignPopUp: state }),
                  // setOpenCreateClaimPopUp: (state: boolean | null) => set({ openCreateClaimPopUp: state }),
                  // setOpenCreateClaimAttestationPopUp: (state: boolean | null) => set({ openCreateClaimAttestationPopUp: state }),

                  setApiFileData: (apiFileData: ApiFileData[]) => set({ apiFileData: apiFileData }),
                  setSystemFileInfo: (systemFileInfo: ApiFileInfo[]) => set({ systemFileInfo: systemFileInfo }),
                  setFormTemplate: (apiFormTemplate: FormTemplate[]) => set({ formTemplates: apiFormTemplate }),
                  setContracts: (contractData: any[]) => set({ contracts: contractData }),
                  setWebConfig(config) {
                        set({ webConfig: config })
                  },
                  setWorkSpaceDowload(config) {
                        set({ workSpaceDowload: config })
                  },
                  addFile: (file: ApiFileInfo) => {
                        const { files } = appStore.getState()
                        files.fileData = [file, ...files.fileData]
                        set({ files: files })
                  },
                  setBackEndUrl: (backend_url: AppStoreState['backend_url']) => {
                        let urlData = ensureDomainUrlHasSSL(backend_url)
                        set({ backend_url: urlData })
                  },
                  resetState: () => {
                        set(INITIAL_STATE)
                  }
            }),
            {
                  name: 'app-store', // Unique name for storage key
                  storage: createJSONStorage(() => indexedDBStorage),
                  partialize: state => ({
                        // List all state properties you want to persist EXCEPT selectedFileInfo
                        user_profile: state.user_profile,
                        session: state.session,
                        // files: state.files,
                        apiFileData: state.apiFileData,
                        metamaskAddress: state.metamaskAddress,
                        avatar: state.avatar,
                        backend_url: state.backend_url,
                        // selectedFileInfo & setApiFileData is intentionally omitted
                  }),
            }
      )
)

export default appStore
