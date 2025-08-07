import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Globe, UserLock, Signature, Phone, Mail } from 'lucide-react';
import { createPortal } from 'react-dom';
import appStore from '../store'
import { useStore } from 'zustand'
 
export default function ClaimTypesDropdownButton() {
   const {setOpenDialog  } = useStore(appStore)
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleItemClick = (item: 'identity_claim' | 'dns_claim' | 'user_signature' | 'email_claim' | 'phone_number_claim' ) => {
    console.log(`Selected: ${item}`);
    setIsOpen(false);

    setOpenDialog({ dialogType: item, isOpen: true, onClose: () => setOpenDialog(null), onConfirm: () => { } })
  };

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // w-56 = 14rem = 224px
      const dropdownHeight = 88; // Approximate height of dropdown with 2 items
      
      let top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX;
      
      // Check if dropdown would overflow to the right
      if (left + dropdownWidth > window.innerWidth) {
        left = rect.right + window.scrollX - dropdownWidth;
      }
      
      // Check if dropdown would overflow to the bottom
      if (rect.bottom + dropdownHeight > window.innerHeight) {
        // Position above the button instead
        top = rect.top + window.scrollY - dropdownHeight - 8;
      }
      
      // Ensure dropdown doesn't go off the left edge
      if (left < 0) {
        left = 8; // Small margin from edge
      }
      
      // Ensure dropdown doesn't go off the top
      if (top < window.scrollY) {
        top = rect.bottom + window.scrollY + 8; // Fall back to below button
      }
      
      setDropdownPosition({ top, left });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      const handleResize = () => updateDropdownPosition();
      const handleScroll = () => updateDropdownPosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isOpen]);

  const dropdownContent = isOpen ? (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9999]" 
        onClick={() => setIsOpen(false)}
      />
      
      {/* Dropdown menu */}
      <div 
        className="fixed z-[10000] w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`
        }}
      >
        <div className="py-1">
          <button
           data-testid="create-simple-claim-dropdown-button-item"
            onClick={() => handleItemClick('identity_claim')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <UserLock className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            Create Simple Claim
          </button>
          
          <button
          data-testid="create-dns-claim-dropdown-button-item"
            onClick={() => handleItemClick('dns_claim')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <Globe className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            Create DNS Claim
          </button>


           <button
          data-testid="create-dns-claim-dropdown-button-item"
            onClick={() => handleItemClick('user_signature')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <Signature className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            Create Signature
          </button>

             <button
          data-testid="create-dns-claim-dropdown-button-item"
            onClick={() => handleItemClick('email_claim')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <Mail className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            Create Email Claim
          </button>



             <button
          data-testid="create-dns-claim-dropdown-button-item"
            onClick={() => handleItemClick('phone_number_claim')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <Phone className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            Create Phone Number claim
          </button>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <div className="relative inline-block text-left">
        <button
          ref={buttonRef}
          type="button"
          className="flex items-center gap-1 sm:gap-2 text-white px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium hover:bg-gray-700 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
          onClick={handleToggle}
          style={{ backgroundColor: '#3A5BF8' }}
          aria-expanded={isOpen}
          aria-haspopup="true"
          data-testid="create-claim-dropdown-button"
        >
          <Plus className="w-4 h-4" />
          Create Claim
          <ChevronDown 
            className={`h-4 w-4 text-white transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>
      </div>
      
      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}