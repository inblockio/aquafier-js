import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverAnchor } from './ui/popover';
import { ContactsService } from '@/storage/databases/contactsDb';
import { ContactProfile } from '@/types/types';
import { toast } from 'sonner';
import appStore from '@/store';
import { useStore } from 'zustand';
import { cn } from '@/lib/utils';
import { ensureDomainUrlHasSSL } from '@/utils/functions';

interface WalletAutosuggestProps {
  field: {
    name: string;
  };
  index: number;
  address: string;
  multipleAddresses: string[];
  setMultipleAddresses: (addresses: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}
export const WalletAutosuggest: React.FC<WalletAutosuggestProps> = ({
  field,
  index,
  address,
  multipleAddresses,
  setMultipleAddresses,
  placeholder = "Add Wallet address or contact details.",//"For autosuggest, enter any details of the contact (Wallet, Name in Identity claim, Email in Email claim, ENS name or user Alias) ...",
  className = "",
  disabled = false 
}) => {

  const { session, backend_url } = useStore(appStore);
  const [suggestions, setSuggestions] = useState<ContactProfile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
  const [loadingEns, setLoadingEns] = useState<boolean>(false);
  const [ensName, setEnsName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const contactsService = ContactsService.getInstance();
  const suggestionsRef = useRef<HTMLDivElement>(null);


  const resolveENS = async () : Promise<string | null> => {
    const trimmedInput = address.trim();

    if (!trimmedInput) {
      console.log('Please enter an Ethereum address or ENS name');
      return null;
    }

    if (!session?.nonce) {
      console.log('Please connect your wallet first');
      return null;
    }

    setLoadingEns(true);

    try {
      const url = ensureDomainUrlHasSSL(`${backend_url}/resolve/${trimmedInput}?useEns=true`) 
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'nonce': session.nonce,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // data.type indicates what the result is:
        // 'ens_name' means input was address, result is ENS name
        // Otherwise, input was ENS name, result is wallet address

        if (data.type === 'ens_name') {
          // Input was wallet address, result is ENS name
          setEnsName(data.result);
          return trimmedInput; // Return the wallet address
        } else {
          // Input was ENS name, result is wallet address
          setEnsName(trimmedInput);
          return data.result; // Return the wallet address
        }
      } else {
        toast.error(data.message || 'Resolution failed');
        return null;
      }
    } catch (err) {
      console.error('Resolution error:', err);
      toast.error('Failed to resolve. The service may be unavailable.');
      return null;
    } finally {
      setLoadingEns(false);
    }
  };

  // Filter suggestions based on input - searches contacts database
  const filterSuggestions = async (input: string): Promise<ContactProfile[]> => {
    if (!input || input.length < 1) {
      return [];
    }
    
    try {
      const searchResults = await contactsService.searchContacts(input);
      return searchResults.slice(0, 5); // Limit to 5 suggestions
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  };

  const handleInputChange = async (ev: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const value: string = ev.target.value;

    // Update the addresses array
    const newData: string[] = multipleAddresses.map((e: string, i: number) => {
      if (i === index) {
        return value;
      }
      return e;
    });
    setMultipleAddresses(newData);

    // Clear ENS name when user manually edits
    if (ensName && value !== address) {
      setEnsName('');
    }

    // Update suggestions
    const filtered: ContactProfile[] = await filterSuggestions(value);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setActiveSuggestion(-1);
  };

  const handleSuggestionClick = (contact: ContactProfile): void => {
    // Always store the wallet address in multipleAddresses
    const newData: string[] = multipleAddresses.map((e: string, i: number) => {
      if (i === index) {
        return contact.walletAddress;
      }
      return e;
    });
    setMultipleAddresses(newData);

    // Store the ENS name separately for display purposes
    if (contact.ensName) {
      setEnsName(contact.ensName);
    } else {
      setEnsName('');
    }

    setShowSuggestions(false);
    setActiveSuggestion(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = async (ev: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
    // Handle ENS resolution first if input ends with .eth and Enter is pressed
    if (ev.key === 'Enter' && address.trim().endsWith('.eth') && (!showSuggestions || activeSuggestion < 0)) {
      ev.preventDefault();
      const resolved = await resolveENS();
      if (resolved) {
        // Update the addresses array with resolved address
        const newData: string[] = multipleAddresses.map((e: string, i: number) => {
          if (i === index) {
            return resolved;
          }
          return e;
        });
        setMultipleAddresses(newData);
        toast.success(`Resolved ${address.trim()} to ${resolved.slice(0, 10)}...${resolved.slice(-6)}`);
      }
      return;
    }

    if (showSuggestions) {
      switch (ev.key) {
        case 'ArrowDown':
          ev.preventDefault();
          setActiveSuggestion((prev: number) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;

        case 'ArrowUp':
          ev.preventDefault();
          setActiveSuggestion((prev: number) => prev > 0 ? prev - 1 : -1);
          break;

        case 'Enter':
          ev.preventDefault();
          if (activeSuggestion >= 0) {
            handleSuggestionClick(suggestions[activeSuggestion]);
            return;
          }
          break;

        case 'Escape':
          setShowSuggestions(false);
          setActiveSuggestion(-1);
          break;
      }
    }
  };

  const handleBlur = async (_ev: React.FocusEvent<HTMLInputElement>): Promise<void> => {
    // Delay hiding suggestions to allow for click events
    setTimeout(async () => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setActiveSuggestion(-1);

        // Auto-resolve ENS if input ends with .eth
        if (address.trim().endsWith('.eth') && !ensName) {
          const resolved = await resolveENS();
          if (resolved) {
            // Update the addresses array with resolved address
            const newData: string[] = multipleAddresses.map((e: string, i: number) => {
              if (i === index) {
                return resolved;
              }
              return e;
            });
            setMultipleAddresses(newData);
          }
        }
      }
    }, 150);
  };

  const handleFocus = (): void => {
    if (address && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Update suggestions when address changes externally
  useEffect(() => {
    const updateSuggestions = async () => {
      if (address) {
        const filtered = await filterSuggestions(address);
        setSuggestions(filtered);
      }
    };
    updateSuggestions();
  }, [address]);

  return (
    <div className="relative">
      {loadingEns && (
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Resolving ENS...
          </span>
        </div>
      )}
      {!loadingEns && address.trim().endsWith('.eth') && !ensName && (
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
            Press Enter or tab out to resolve ENS
          </span>
        </div>
      )}
      {ensName && !loadingEns && (
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
            ENS: {ensName}
          </span>
        </div>
      )}
      <Popover open={showSuggestions && suggestions.length > 0} onOpenChange={setShowSuggestions}>
        <PopoverAnchor asChild>
          
         <Input
  ref={inputRef}
  data-testid={`input-${field.name}-${index}`}
  className={cn(className, "[&::placeholder]:text-xs")}
  placeholder={placeholder}
  type="text"
  value={address}
  onChange={handleInputChange}
  onKeyDown={handleKeyDown}
  onBlur={handleBlur}
  onFocus={handleFocus}
  autoComplete="off"
  disabled={disabled}
/>
          
        </PopoverAnchor>

        <PopoverContent
          ref={suggestionsRef}
          className="w-[var(--radix-popover-trigger-width)] p-0 max-h-48 overflow-y-auto"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
        {suggestions.map((contact: ContactProfile, suggestionIndex: number) => (
          <div
            key={contact.walletAddress}
            className={`px-4 py-2 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 ${
              suggestionIndex === activeSuggestion
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => {
              handleSuggestionClick(contact);
            }}
          >
            <div className="truncate">
              <div className="font-medium">
                {contact.name || 'Unnamed Contact'}
                {contact.email && <span className="text-xs ml-2 text-gray-500">({contact.email})</span>}
              </div>
              {contact.ensName && (
                <div className="text-xs text-blue-600 font-medium mt-1">
                  {contact.ensName}
                </div>
              )}
              <div className="text-xs text-gray-500 font-mono mt-1" title={contact.walletAddress}>
                {contact.walletAddress.slice(0, 10)}...{contact.walletAddress.slice(-6)}
              </div>
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
    </div>
  );
};