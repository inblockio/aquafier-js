
import { IDBPDatabase, openDB } from 'idb';
import { createStore } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ApiFileInfo } from './models/FileInfo';
import { ApiFileData, Session } from './types/types';
import { FormTemplate } from './components/aqua_forms/types';

type AppStoreState = {
    user_profile: {
        user_pub_key: string,
        cli_pub_key: string,
        cli_priv_key: string,
        witness_network: string,
        alchemy_key: string,
        theme: string,
        ens_name: string,
        witness_contract_address: string | null
    },
    session: Session | null,
    files: ApiFileInfo[],
    apiFileData: ApiFileData[],
    systemFileInfo :  ApiFileInfo[],
    formTemplates: FormTemplate[],
    selectedFileInfo: ApiFileInfo | null,
    openFilesDetailsPopUp: boolean | null,
    openCreateTemplatePopUp: boolean | null,
    openCreateAquaSignPopUp: boolean | null,
    metamaskAddress: string | null,
    avatar: string | undefined,
    backend_url: string,
    contracts : any[]
}

type AppStoreActions = {
    setUserProfile: (
        config: AppStoreState['user_profile'],
    ) => void,
    setSession: (
        config: AppStoreState['session'],
    ) => void,
    setMetamaskAddress: (
        address: AppStoreState['metamaskAddress'],
    ) => void,
    setAvatar: (
        avatar: AppStoreState['avatar'],
    ) => void,
    setFiles: (
        files: AppStoreState['files'],
    ) => void,
    setSelectedFileInfo: (
        file: ApiFileInfo | null ,
    ) => void,
    setOpenFileDetailsPopUp: (
        state: boolean | null ,
    ) => void,
    setOpenCreateTemplatePopUp: (
        state: boolean | null ,
    ) => void,
    setOpenCreateAquaSignPopUp: (
        state: boolean | null ,
    ) => void,
    addFile: (
        file: ApiFileInfo,
    ) => void,
    setApiFileData: (
        apiFileData: ApiFileData[],
    ) => void,
    setSystemFileInfo: (
        systemFileInfo: ApiFileInfo[],
    ) => void,
    setFormTemplate: (
        apiFileData: FormTemplate[],
    ) => void,
    setContracts: (
        contracts: any[],
    ) => void,
    setBackEndUrl: (
        backend_url: AppStoreState['backend_url'],
    ) => void


}

type TAppStore = AppStoreState & AppStoreActions


// Open an IndexedDB instance
// const dbPromise = openDB('aquafier-db', 2, {
//     upgrade(db) {
//         db.createObjectStore('store');
//     },
// });

// // Custom storage object for Zustand using IndexedDB
// const indexedDBStorage = {
//     getItem: async (name: string) => {
//         const db = await dbPromise;
//         return (await db.get('store', name)) || null;
//     },
//     setItem: async (name: string, value: string) => {
//         const db = await dbPromise;
//         await db.put('store', value, name);
//     },
//     removeItem: async (name: string) => {
//         const db = await dbPromise;
//         await db.delete('store', name);
//     },
// };

// Create a singleton promise for the database to prevent multiple upgrade attempts
let dbPromiseInstance: Promise<IDBPDatabase> | null = null;

const getDbPromise = () => {
    if (!dbPromiseInstance) {
        dbPromiseInstance = openDB('aquafier-db', 2, {
            upgrade(db, oldVersion, newVersion, _transaction) {
                console.log(`Upgrading from version ${oldVersion} to ${newVersion}`);
                
                // Handle version upgrades properly
                if (!db.objectStoreNames.contains('store')) {
                    db.createObjectStore('store');
                }
                
                // Add more version upgrade logic here if needed
                // Example for future versions:
                // if (oldVersion < 2) {
                //     // Migration logic for version 2
                // }
            },
            
            // Add blocking handler to prevent version conflicts
            blocked() {
                console.warn('Database upgrade blocked by another connection');
                // Optionally notify user or handle the blocking situation
            },
            
            // Add blocking handler for close events
            blocking() {
                console.warn('Database needs to close for upgrade');
                // Optionally notify user or handle the blocking situation
            }
        }).catch(error => {
            console.error('Database opening error:', error);
            dbPromiseInstance = null; // Reset on error to allow retry
            throw error;
        });
    }
    return dbPromiseInstance;
};

// Custom storage object for Zustand using IndexedDB
const indexedDBStorage = {
    getItem: async (name: string) => {
        try {
            const db = await getDbPromise();
            return (await db.get('store', name)) || null;
        } catch (error) {
            console.error('Error getting item from IndexedDB:', error);
            return null;
        }
    },
    setItem: async (name: string, value: string) => {
        try {
            const db = await getDbPromise();
            await db.put('store', value, name);
        } catch (error) {
            console.error('Error setting item in IndexedDB:', error);
            throw error;
        }
    },
    removeItem: async (name: string) => {
        try {
            const db = await getDbPromise();
            await db.delete('store', name);
        } catch (error) {
            console.error('Error removing item from IndexedDB:', error);
            throw error;
        }
    },
};

const appStore = createStore<TAppStore>()(
    persist(
        (set) => ({
            // Initial state
            user_profile: {
                ens_name: "",
                user_pub_key: "",
                cli_pub_key: "",
                cli_priv_key: "",
                witness_network: "",
                alchemy_key: "",
                theme: "light",
                witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
            },
            session: null,
            files: [],
            selectedFileInfo: null,
            openFilesDetailsPopUp: false,
            openCreateTemplatePopUp: false,
            openCreateAquaSignPopUp: false,
            metamaskAddress: '',
            avatar: "",
            apiFileData: [],
            systemFileInfo:[],
            formTemplates: [],
            backend_url: "http://0.0.0.0:3000",
            contracts: [],

            // Actions
            setUserProfile: (config) => set({ user_profile: config }),
            setSession: (session) => set({ session: session }),
            setMetamaskAddress: (
                address: AppStoreState['metamaskAddress'],
            ) => set({ metamaskAddress: address }),
            setAvatar: (
                avatar: AppStoreState['avatar'],
            ) => set({ avatar: avatar }),
            setFiles: (
                files: AppStoreState['files'],
            ) => set({ files: files }),
            setSelectedFileInfo: (
                file: ApiFileInfo | null
            ) => set({ selectedFileInfo: file }),

            setOpenFileDetailsPopUp: (
                state: boolean | null
            ) => set({ openFilesDetailsPopUp: state }),
            setOpenCreateTemplatePopUp: (
                state: boolean | null
            ) => set({ openCreateTemplatePopUp: state }),
             setOpenCreateAquaSignPopUp: (
                state: boolean | null
            ) => set({ openCreateAquaSignPopUp: state }),
            
            setApiFileData: (
                apiFileData: ApiFileData[]
            ) => set({ apiFileData: apiFileData }),
            setSystemFileInfo: (
                systemFileInfo: ApiFileInfo[]
            ) => set({ systemFileInfo: systemFileInfo }),
            setFormTemplate: (
                apiFormTemplate: FormTemplate[]
            ) => set({ formTemplates: apiFormTemplate }),
            setContracts: (
                contractData: any[]
            ) => set({ contracts: contractData }),
            addFile: (
                file: ApiFileInfo,
            ) => {
                const { files } = appStore.getState()
                set({ files: [...files, file] })
            },
            setBackEndUrl: (
                backend_url: AppStoreState['backend_url'],
            ) => set({ backend_url: backend_url }),
        }),
        {
            name: 'app-store', // Unique name for storage key
            storage: createJSONStorage(() => indexedDBStorage),
            partialize: (state) => ({
                // List all state properties you want to persist EXCEPT selectedFileInfo
                user_profile: state.user_profile,
                session: state.session,
                // files: state.files,
                apiFileData: state.apiFileData,
                metamaskAddress: state.metamaskAddress,
                avatar: state.avatar,
                backend_url: state.backend_url
                // selectedFileInfo & setApiFileData is intentionally omitted
            }),
        }
    )
);

export default appStore;
