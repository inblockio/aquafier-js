import { createStore } from 'solid-js/store'
import { createEffect, onMount } from 'solid-js'
import { IDBPDatabase, openDB } from 'idb'
import { ApiFileInfo } from './models/FileInfo'
import { ApiFileData, ApiFileInfoState, OpenDialog, Session, WebConfig } from './types/types'
import { FormTemplate } from './types/aqua_forms'
import { ensureDomainUrlHasSSL } from './utils/functions'

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
  }
  session: Session | null
  files: ApiFileInfoState
  workflows: ApiFileInfoState
  webConfig: WebConfig
  apiFileData: ApiFileData[]
  systemFileInfo: ApiFileInfo[]
  formTemplates: FormTemplate[]
  selectedFileInfo: ApiFileInfo | null
  openDialog: OpenDialog | null
  metamaskAddress: string | null
  avatar: string | undefined
  backend_url: string
  contracts: any[]
}

// Singleton database promise
let dbPromiseInstance: Promise<IDBPDatabase> | null = null

const getDbPromise = () => {
  if (!dbPromiseInstance) {
    dbPromiseInstance = openDB('aquafier-db', 2, {
      upgrade(db, _oldVersion, _newVersion, _transaction) {
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store')
        }
      },
      blocked() {
        console.warn('Database upgrade blocked by another connection')
      },
      blocking() {
        console.warn('Database needs to close for upgrade')
      },
    }).catch(error => {
      console.error('Database opening error:', error)
      dbPromiseInstance = null
      throw error
    })
  }
  return dbPromiseInstance
}

// IndexedDB persistence helpers
const loadFromIndexedDB = async (key: string) => {
  try {
    const db = await getDbPromise()
    const value = await db.get('store', key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.error('Error loading from IndexedDB:', error)
    return null
  }
}

const saveToIndexedDB = async (key: string, value: any) => {
  try {
    const db = await getDbPromise()
    await db.put('store', JSON.stringify(value), key)
  } catch (error) {
    console.error('Error saving to IndexedDB:', error)
  }
}

// Initial state
const initialState: AppStoreState = {
  user_profile: {
    ens_name: '',
    user_pub_key: '',
    cli_pub_key: '',
    cli_priv_key: '',
    witness_network: '',
    alchemy_key: '',
    theme: 'light',
    enable_dba_claim: false,
    witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
  },
  session: null,
  files: {
    fileData: [],
    status: 'idle',
  },
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
    AUTH_PROVIDER: undefined
  },
  openDialog: null,
  metamaskAddress: '',
  avatar: '',
  apiFileData: [],
  systemFileInfo: [],
  formTemplates: [],
  backend_url: 'http://127.0.0.1:3000',
  contracts: [],
}

// Create the store
const [appStore, setAppStore] = createStore<AppStoreState>(initialState)

// Properties to persist (excluding selectedFileInfo)
const persistedKeys: (keyof AppStoreState)[] = [
  'user_profile',
  'session',
  'apiFileData',
  'metamaskAddress',
  'avatar',
  'backend_url',
]

// Auto-persist logic - runs when persisted properties change
let isHydrating = false

createEffect(() => {
  if (isHydrating) return

  const stateToPersist: Partial<AppStoreState> = {}
  persistedKeys.forEach(key => {
    stateToPersist[key] = appStore[key] as any
  })

  saveToIndexedDB('app-store', stateToPersist)
})

// Hydrate from IndexedDB on initialization
export const hydrateStore = async () => {
  isHydrating = true
  const persisted = await loadFromIndexedDB('app-store')
  
  if (persisted) {
    setAppStore(persisted)
  }
  
  isHydrating = false
}

// Store actions
export const appStoreActions = {
  setUserProfile: (config: AppStoreState['user_profile']) => {
    setAppStore('user_profile', config)
  },

  setSession: (session: Session | null) => {
    setAppStore('session', session)
  },

  setMetamaskAddress: (address: string | null) => {
    setAppStore('metamaskAddress', address)
  },

  setAvatar: (avatar: string | undefined) => {
    setAppStore('avatar', avatar)
  },

  setFiles: (files: ApiFileInfoState) => {
    setAppStore('files', files)
  },

  setWorkflows: (workflows: ApiFileInfoState) => {
    setAppStore('workflows', workflows)
  },

  setWebConfig: (config: WebConfig) => {
    setAppStore('webConfig', config)
  },

  setSelectedFileInfo: (file: ApiFileInfo | null) => {
    setAppStore('selectedFileInfo', file)
  },

  setOpenDialog: (state: OpenDialog | null) => {
    setAppStore('openDialog', state)
  },

  setApiFileData: (apiFileData: ApiFileData[]) => {
    setAppStore('apiFileData', apiFileData)
  },

  setSystemFileInfo: (systemFileInfo: ApiFileInfo[]) => {
    setAppStore('systemFileInfo', systemFileInfo)
  },

  setFormTemplate: (formTemplates: FormTemplate[]) => {
    setAppStore('formTemplates', formTemplates)
  },

  setContracts: (contracts: any[]) => {
    setAppStore('contracts', contracts)
  },

  addFile: (file: ApiFileInfo) => {
    setAppStore('files', 'fileData', files => [file, ...files])
  },

  setBackEndUrl: (backend_url: string) => {
    const urlData = ensureDomainUrlHasSSL(backend_url)
    setAppStore('backend_url', urlData)
  },
}

export { appStore }
export default appStore