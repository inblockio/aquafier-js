
import { openDB } from 'idb';
import { createStore } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ApiFileInfo } from './models/FileInfo';
import { Session } from './types';

type AppStoreState = {
    user_profile: {
        user_pub_key: string,
        cli_pub_key: string,
        cli_priv_key: string,
        witness_network: string,
        theme: string,
        ens_name: string,
        witness_contract_address: string | null
    },
    session: Session | null,
    files: ApiFileInfo[],
    selectedFileInfo: ApiFileInfo | null,
    metamaskAddress: string | null
    avatar: string | undefined
    backend_url: string
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
        file: ApiFileInfo,
    ) => void,
    addFile: (
        file: ApiFileInfo,
    ) => void,
    setBackEndUrl: (
        backend_url: AppStoreState['backend_url'],
    ) => void

}

type TAppStore = AppStoreState & AppStoreActions


// Open an IndexedDB instance
const dbPromise = openDB('aquafier-db', 1, {
    upgrade(db) {
        db.createObjectStore('store');
    },
});

// Custom storage object for Zustand using IndexedDB
const indexedDBStorage = {
    getItem: async (name: string) => {
        const db = await dbPromise;
        return (await db.get('store', name)) || null;
    },
    setItem: async (name: string, value: string) => {
        const db = await dbPromise;
        await db.put('store', value, name);
    },
    removeItem: async (name: string) => {
        const db = await dbPromise;
        await db.delete('store', name);
    },
};

const appStore = createStore<TAppStore>()(
    persist(
        (set) => ({
            // Initial state
            user_profile: {
                ens_name:"",
                user_pub_key: "",
                cli_pub_key: "",
                cli_priv_key: "",
                witness_network: "",
                theme: "light",
                witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
            },
            session: null,
            files: [],
            selectedFileInfo: null,
            metamaskAddress: '',
            avatar: "",
            backend_url: "http://0.0.0.0:0",
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
                file: ApiFileInfo
            ) => set({ selectedFileInfo: file }),
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
            storage: createJSONStorage(() => indexedDBStorage)
        }
    )
);

export default appStore;
