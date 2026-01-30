import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import axios from 'axios';
import appStore from '@/store';
import { ContactProfile } from '@/types/types';
import { ApiFileInfo } from '@/models/FileInfo';
import { API_ENDPOINTS, IDENTITY_CLAIMS } from '@/utils/constants';
import { ensureDomainUrlHasSSL, getGenesisHash, isWorkFlowData } from '@/utils/functions';
// import { OrderRevisionInAquaTree } from 'aqua-js-sdk';
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

  const [localSession, setLocalSession] = useState(session);
  const [localBackendUrl, setLocalBackendUrl] = useState(backend_url);

  const [files, setFiles] = useState<ApiFileInfo[]>([]);
  const [systemAquaFileNames, setSystemAquaFileNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { subscribe } = useNotificationWebSocketContext();

  const contactsService = ContactsService.getInstance();
  const aquaSystemNamesService = AquaSystemNamesService.getInstance();

  // Load system aqua file names
  const loadSystemAquaFileNames = async () => {
    if (!localBackendUrl || !localSession?.nonce) return;
    
    try {
      // First try to load from cache
      const hasCached = await aquaSystemNamesService.hasCachedNames();
      if (hasCached) {
        const cachedNames = await aquaSystemNamesService.getSystemNames();
        setSystemAquaFileNames(cachedNames);
      }

      // Always fetch fresh data from backend and update cache
      const response = await axios.get(ensureDomainUrlHasSSL(`${localBackendUrl}/${API_ENDPOINTS.SYSTEM_AQUA_FILES_NAMES}`), {
        headers: {
          'nonce': localSession.nonce,
          'metamask_address': localSession.address
        }
      });
      
      const freshNames = response.data.data;
      
      // Update local state
      setSystemAquaFileNames(freshNames);
      
      // Save to database for future use
      await aquaSystemNamesService.saveSystemNames(freshNames);
    } catch (error) {
      
      // If backend fails but we have cached data, use that
      const hasCached = await aquaSystemNamesService.hasCachedNames();
      if (hasCached) {
        const cachedNames = await aquaSystemNamesService.getSystemNames();
        setSystemAquaFileNames(cachedNames);
      }
    }
  };

  // Load contact trees from backend
  const loadContactTrees = async () => {
    if (!localSession?.address || !localBackendUrl) return;
    setLoading(true);
    onLoadingChange?.(true);

    try {
      const params = {
        page: 1,
        limit: 10_000,
        claim_types: JSON.stringify(IDENTITY_CLAIMS),
      };

      const filesDataQuery = await axios.get(ensureDomainUrlHasSSL(`${localBackendUrl}/${API_ENDPOINTS.GET_PER_TYPE}`), {
        headers: {
          'Content-Type': 'application/json',
          'nonce': `${localSession!.nonce}`
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

      // const orderedAquaTree = OrderRevisionInAquaTree(element.aquaTree!);
      // const allRevisions = Object.values(orderedAquaTree.revisions);
      let walletAddress = "";

      const walletAddressField: Record<string, string> = {
        identity_attestation: "forms_claim_wallet_address",
        ens_claim: "forms_wallet_address",
        identity_claim: "forms_wallet_address"
      }

      // This code block somehow is broken, replaced it below
      // if (workFlow.workFlow == "identity_attestation" || workFlow.workFlow == "ens_claim" || workFlow.workFlow == "simple_claim") {
      //   let genHash = getGenesisHash(element.aquaTree!);
      //   console.log("We went to genesis revision for: ", element)
      //   if (genHash) {
      //     let genRevision = element.aquaTree!.revisions[genHash];
      //     let walletClaimOwner = genRevision["forms_claim_wallet_address"];
      //     if (walletClaimOwner) {
      //       walletAddress = walletClaimOwner;
      //     }
      //   }
      // } else {
      //   const signatureRevision = allRevisions.find(
      //     (r) => r.revision_type === "signature"
      //   ) as Revision | undefined;
      //   if (signatureRevision?.signature_wallet_address){
      //     walletAddress = signatureRevision.signature_wallet_address;
      //   }
      // }

      const genesisHash = getGenesisHash(element.aquaTree!)
      const genesisRevision = element.aquaTree?.revisions[genesisHash!]
      const addressField = walletAddressField[workFlow.workFlow] || "forms_wallet_address"
      if(genesisRevision){
        walletAddress = genesisRevision[addressField]
      }

      let claimValue: string = "";
      let genHash = getGenesisHash(element.aquaTree!);

      if (genHash) {
        let genRevision = element.aquaTree!.revisions[genHash];
        const claimFieldMap: Record<string, string> = {
          "identity_claim": "forms_name",
          "email_claim": "forms_email",
          "phone_number_claim": "forms_phone_number",
          "user_signature": "forms_name",
          "domain_claim": "forms_domain",
          "ens_claim": "forms_ens_name"
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
          "ens_claim": ["forms_ens_name", "forms_wallet_address"],
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
          if (existingProfile.name === "" && (claimType === "identity_claim" || claimType === "user_signature")) {
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
              name: (claimType === "identity_claim" || claimType === "user_signature") ? claimValue : "",
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
      // Handle notification reload specifically
      if (message.type === 'notification_reload' && message.data && message.data.target === "workflows") {
        loadContactTrees()
      }
    });
    return unsubscribe;
  }, []);

  // Effects
  useEffect(() => {
    if(localBackendUrl && localSession?.nonce){
      loadSystemAquaFileNames();
    }
  }, [localSession?.nonce, localBackendUrl]);

  useEffect(() => {
    loadContactTrees();
  }, [localBackendUrl, localSession?.address]);

  useEffect(() => {
    generateContacts();
  }, [watchFilesChange, systemAquaFileNames]);

  useEffect(() => {
    if (session && backend_url){
      setLocalBackendUrl(backend_url);
      setLocalSession(session);
    }
  }, [session, backend_url]);

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