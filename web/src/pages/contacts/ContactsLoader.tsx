import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import axios from 'axios';
import appStore from '@/store';
import { ContactProfile } from '@/types/types';
import { ApiFileInfo } from '@/models/FileInfo';
import { API_ENDPOINTS, IDENTITY_CLAIMS } from '@/utils/constants';
import { getGenesisHash, isWorkFlowData } from '@/utils/functions';
import { OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { ContactsService } from '@/storage/databases/contactsDb';
import { AquaSystemNamesService } from '@/storage/databases/aquaSystemNames';
import { useReloadWatcher } from '@/hooks/useReloadWatcher';
import { useNotificationWebSocketContext } from '@/contexts/NotificationWebSocketContext';

interface ContactsLoaderProps {
  onContactsLoaded?: (contacts: ContactProfile[]) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const ContactsLoader: React.FC<ContactsLoaderProps> = ({
  onContactsLoaded,
  onLoadingChange
}) => {
  const { session, backend_url } = useStore(appStore);
  const [files, setFiles] = useState<ApiFileInfo[]>([]);
  const [systemAquaFileNames, setSystemAquaFileNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { subscribe } = useNotificationWebSocketContext();

  const contactsService = ContactsService.getInstance();
  const aquaSystemNamesService = AquaSystemNamesService.getInstance();

  // Load system aqua file names
  const loadSystemAquaFileNames = async () => {
    if (!session?.nonce) return;
    
    try {
      // First try to load from cache
      const hasCached = await aquaSystemNamesService.hasCachedNames();
      if (hasCached) {
        const cachedNames = await aquaSystemNamesService.getSystemNames();
        setSystemAquaFileNames(cachedNames);
        console.log("Loaded system names from cache:", cachedNames.length);
      }

      // Always fetch fresh data from backend and update cache
      const response = await axios.get(`${backend_url}/${API_ENDPOINTS.SYSTEM_AQUA_FILES_NAMES}`, {
        headers: {
          'nonce': session.nonce,
          'metamask_address': session.address
        }
      });
      
      const freshNames = response.data.data;
      
      // Update local state
      setSystemAquaFileNames(freshNames);
      
      // Save to database for future use
      await aquaSystemNamesService.saveSystemNames(freshNames);
      
      // console.log("Updated system names from backend:", freshNames.length);
    } catch (error) {
      console.log("Error getting system aqua file names", error);
      
      // If backend fails but we have cached data, use that
      const hasCached = await aquaSystemNamesService.hasCachedNames();
      if (hasCached) {
        const cachedNames = await aquaSystemNamesService.getSystemNames();
        setSystemAquaFileNames(cachedNames);
        console.log("Using cached system names due to backend error:", cachedNames.length);
      }
    }
  };

  // Load contact trees from backend
  const loadContactTrees = async () => {
    if (!session?.address || !backend_url) return;
    setLoading(true);
    onLoadingChange?.(true);

    try {
      const params = {
        page: 1,
        limit: 200,
        claim_types: JSON.stringify(IDENTITY_CLAIMS),
      };

      const filesDataQuery = await axios.get(`${backend_url}/${API_ENDPOINTS.GET_PER_TYPE}`, {
        headers: {
          'Content-Type': 'application/json',
          'nonce': `${session!.nonce}`
        },
        params
      });

      const response = filesDataQuery.data;
      const aquaTrees = response.aquaTrees;
      setFiles(aquaTrees);
    } catch (error) {
      console.error('Error loading contact trees:', error);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  // Generate contacts from files
  const generateContacts = async () => {
    if (!files?.length || !systemAquaFileNames?.length) return;

    setIsProcessing(true);
    const contactProfileMap = new Map<string, ContactProfile>();

    // Process files in parallel
    const processFile = async (element: ApiFileInfo) => {
      const workFlow = isWorkFlowData(element.aquaTree!, systemAquaFileNames);
      if (!workFlow.isWorkFlow || !workFlow.workFlow) return null;

      const claimType = workFlow.workFlow;
      if (!IDENTITY_CLAIMS.includes(claimType)) return null;

      const orderedAquaTree = OrderRevisionInAquaTree(element.aquaTree!);
      const allRevisions = Object.values(orderedAquaTree.revisions);
      let walletAddress = "";

      if (workFlow.workFlow == "identity_attestation") {
        let genHash = getGenesisHash(element.aquaTree!);
        if (genHash) {
          let genRevision = element.aquaTree!.revisions[genHash];
          let walletClaimOwner = genRevision["forms_claim_wallet_address"];
          if (walletClaimOwner) {
            walletAddress = walletClaimOwner;
          }
        }
      } else {
        const signatureRevision = allRevisions.find(
          (r) => r.revision_type === "signature"
        ) as Revision | undefined;

        if (!signatureRevision?.signature_wallet_address) return null;
        walletAddress = signatureRevision.signature_wallet_address;
      }

      let claimValue: string = "";
      let genHash = getGenesisHash(element.aquaTree!);

      if (genHash) {
        let genRevision = element.aquaTree!.revisions[genHash];
        const claimFieldMap: Record<string, string> = {
          "identity_claim": "forms_name",
          "email_claim": "forms_email",
          "phone_number_claim": "forms_phone_number",
          "user_signature": "forms_wallet_address",
          "domain_claim": "forms_domain"
        };

        const fieldName = claimFieldMap[claimType];
        if (fieldName && genRevision[fieldName]) {
          claimValue = genRevision[fieldName];
        }
      }

      let searchText = "";
      if (genHash) {
        let genRevision = element.aquaTree!.revisions[genHash];
        const claimSearchFieldsMap: Record<string, string[]> = {
          "identity_claim": ["forms_name", "forms_wallet_address"],
          "phone_number_claim": ["forms_phone_number", "forms_wallet_address"],
          "email_claim": ["forms_email", "forms_wallet_address"],
          "user_signature": ["forms_wallet_address", "forms_name"],
          "domain_claim": ["forms_domain", "forms_wallet_address"],
          //   "identity_attestation": ["forms_context", "forms_wallet_address"]
        };

        const searchFields = claimSearchFieldsMap[claimType];
        if (searchFields) {
          for (const field of searchFields) {
            if (genRevision[field]) {
              searchText += genRevision[field] + " ";
            }
          }
        }
      }

      return {
        walletAddress,
        claimType,
        claimValue,
        searchText,
        element
      };
    };

    try {
      // Process all files in parallel
      const processedFiles = await Promise.all(files.map(processFile));
      const validResults = processedFiles.filter(result => result !== null);

      for (const result of validResults) {
        const { walletAddress, claimType, claimValue, searchText, element } = result!;

        let existingProfile = contactProfileMap.get(walletAddress);

        if (existingProfile) {
          existingProfile.files.push(element);

          // Update profile fields
          if (existingProfile.name === "" && claimType === "identity_claim") {
            existingProfile.name = claimValue;
          }
          if (existingProfile.phone === "" && claimType === "phone_number_claim") {
            existingProfile.phone = claimValue;
          }
          if (existingProfile.email === "" && claimType === "email_claim") {
            existingProfile.email = claimValue;
          }

          // Update claims
          if (claimValue) {
            if (existingProfile.claims[claimType]) {
              existingProfile.claims[claimType].push(claimValue);
            } else {
              existingProfile.claims[claimType] = [claimValue];
            }
          }

          existingProfile.searchString = existingProfile.searchString + " " + searchText;
          contactProfileMap.set(walletAddress, existingProfile);

        } else {
          if (walletAddress) {
            contactProfileMap.set(walletAddress, {
              walletAddress,
              files: [element],
              name: claimType === "identity_claim" ? claimValue : "",
              phone: claimType === "phone_number_claim" ? claimValue : "",
              email: claimType === "email_claim" ? claimValue : "",
              searchString: searchText,
              claims: {
                ...(claimValue ? { [claimType]: [claimValue] } : {})
              }
            });
          }
        }
      }

      const contacts = Array.from(contactProfileMap.values());

      // Save to IndexedDB
      await contactsService.bulkUpsertContacts(contacts);

      // Notify parent component
      onContactsLoaded?.(contacts);

    } catch (error) {
      console.error('Error processing contacts:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Watch for file changes
  const watchFilesChange = useMemo(() => {
    if (!files?.length) return '0';

    let totalRevisions = 0;
    let aquaTreeHashes: string[] = [];

    for (const file of files) {
      if (file.aquaTree?.revisions) {
        const revisionCount = Object.keys(file.aquaTree.revisions).length;
        totalRevisions += revisionCount;

        const revisionKeys = Object.keys(file.aquaTree.revisions).sort();
        const aquaTreeHash = `${revisionCount}-${revisionKeys.join(',')}`;
        aquaTreeHashes.push(aquaTreeHash);
      }
    }

    return `${totalRevisions}-${aquaTreeHashes.sort().join('|')}`;
  }, [files]);

  useReloadWatcher({
    key: "contacts",
    onReload: loadContactTrees,
  })

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
        // Handle message
        console.log('WebSocket message received in CONTACTS TABLE:', message);

        // Handle notification reload specifically
        if (message.type === 'notification_reload' && message.data && message.data.target === "workflows") {
          loadContactTrees()
        }

        // Handle other message types
        // if (message.type === 'wallet_update' || message.type === 'contract_update') {
        //     // Optionally reload notifications for these events too
        //     loadFiles();
        // }
    });
    return unsubscribe;
}, []);

  // Effects
  useEffect(() => {
    loadSystemAquaFileNames();
  }, [session?.nonce]);

  useEffect(() => {
    loadContactTrees();
  }, [backend_url, session?.address]);

  useEffect(() => {
    generateContacts();
  }, [watchFilesChange, systemAquaFileNames]);

  return (
    <div className="hidden">
      {/* This component runs in the background */}
      {(loading || isProcessing) && (
        <div className="text-xs text-gray-500">
          {loading ? 'Loading files...' : 'Processing contacts...'}
        </div>
      )}
    </div>
  );
};

export default ContactsLoader;