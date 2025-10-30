import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface WalletAutosuggestProps {
  field: {
    name: string;
  };
  index: number;
  address: string;
  multipleAddresses: string[];
  setMultipleAddresses: (addresses: string[]) => void;
  walletAddresses: Map<string, string>; // New prop: Map of display name -> wallet address
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
  walletAddresses, // Now a required prop
  placeholder = "Enter signer wallet address",
  className = "rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500",
  disabled = false
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input - now checks Map keys
  const filterSuggestions = (input: string): string[] => {
    if (!input || input.length < 1) {
      return [];
    }
    
    return Array.from(walletAddresses.keys()).filter((key: string) => 
      key.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 5); // Limit to 5 suggestions
  };

  const handleInputChange = (ev: React.ChangeEvent<HTMLInputElement>): void => {
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
    const filtered: string[] = filterSuggestions(value);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setActiveSuggestion(-1);
  };

  const handleSuggestionClick = (suggestionKey: string): void => {
    // Get the actual wallet address from the Map using the key
    const walletAddress = walletAddresses.get(suggestionKey);
    
    if (walletAddress) {
      const newData: string[] = multipleAddresses.map((e: string, i: number) => {
        if (i === index) {
          return walletAddress; // Set the Map value (actual wallet address)
        }
        return e;
      });
      setMultipleAddresses(newData);
    }
    
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
    const filtered: string[] = filterSuggestions(address);
    setSuggestions(filtered);
  }, [address, walletAddresses]);

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
          {suggestions.map((suggestionKey: string, suggestionIndex: number) => (
            <div
              key={suggestionKey}
              className={`px-4 py-2 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 ${
                suggestionIndex === activeSuggestion
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleSuggestionClick(suggestionKey)}
              onMouseEnter={() => setActiveSuggestion(suggestionIndex)}
            >
              <div className="truncate" title={suggestionKey}>
                <div className="font-medium">{suggestionKey}</div>
                <div className="text-xs text-gray-500 font-mono mt-1" title={walletAddresses.get(suggestionKey)}>
                  {walletAddresses.get(suggestionKey)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};