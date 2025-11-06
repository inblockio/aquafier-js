import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { ContactsService } from '@/storage/databases/contactsDb';
import { ContactProfile } from '@/types/types';

interface WalletAutosuggestProps {
  field: {
    name: string;
  };
  index: number;
  address: string;
  multipleAddresses: string[];
  setMultipleAddresses: (addresses: string[]) => void;
  walletAddresses?: Map<string, string>; // Optional legacy prop for backward compatibility
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
  placeholder = "Enter wallet address...", 
  className = "", 
  disabled = false 
}) => {
  const [suggestions, setSuggestions] = useState<ContactProfile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const contactsService = ContactsService.getInstance();
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

    // Update suggestions
    const filtered: ContactProfile[] = await filterSuggestions(value);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setActiveSuggestion(-1);
  };

  const handleSuggestionClick = (contact: ContactProfile): void => {
    // Use the contact's wallet address
    const newData: string[] = multipleAddresses.map((e: string, i: number) => {
      if (i === index) {
        return contact.walletAddress; // Set the contact's wallet address
      }
      return e;
    });
    setMultipleAddresses(newData);
    
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!showSuggestions) return;

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
        }
        break;
      
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        break;
    }
  };

  const handleBlur = (_ev: React.FocusEvent<HTMLInputElement>): void => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
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
    <div className="relative w-full">
      <Input
        ref={inputRef}
        data-testid={`input-${field.name}-${index}`}
        className={className}
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
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((contact: ContactProfile, suggestionIndex: number) => (
            <div
              key={contact.walletAddress}
              className={`px-4 py-2 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 ${
                suggestionIndex === activeSuggestion
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleSuggestionClick(contact)}
              onMouseEnter={() => setActiveSuggestion(suggestionIndex)}
            >
              <div className="truncate">
                <div className="font-medium">
                  {contact.name || 'Unnamed Contact'}
                  {contact.email && <span className="text-xs ml-2 text-gray-500">({contact.email})</span>}
                </div>
                <div className="text-xs text-gray-500 font-mono mt-1" title={contact.walletAddress}>
                  {contact.walletAddress.slice(0, 10)}...{contact.walletAddress.slice(-6)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};