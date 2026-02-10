
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe, Mail, Phone, Plus, Scale, Signature, UserLock, Blinds, FileCheck } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { fetchUsageStats } from '../api/subscriptionApi';
import appStore from '../store'
import { useStore } from 'zustand'
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';
import { FaCertificate } from 'react-icons/fa6';

export default function ClaimTypesDropdownButton() {
  const { setOpenDialog, user_profile , isAdmin} = useStore(appStore)
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const {
    usage,
    limits,
    setUsage,
    setUsageLoading
  } = useSubscriptionStore()

  useEffect(() => {
    const loadUsage = async () => {
      if (!usage || !limits) {
        try {
          setUsageLoading(true)
          const data = await fetchUsageStats()
          setUsage(data.usage, data.limits, data.percentage_used)
        } catch (error) {
          console.error('Failed to load usage stats:', error)
        } finally {
          setUsageLoading(false)
        }
      }
    }
    loadUsage()
  }, [])

  // Calculate remaining limits (using existing files remaining logic for claims as requested)
  // For claims (files <= 0), we use the same remaining logic but stricter check
  const filesRemaining = (limits?.max_files || 0) - (usage?.files_count || 0)
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleItemClick = (item: 'identity_claim' | 'dns_claim' | 'user_signature' | 'email_claim' | 'phone_number_claim' | 'dba_claim' | 'identity_card' | 'aqua_certificate' | 'aquafier_licence') => {
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
            Create Name Claim
          </button>

          <button
            data-testid="create-dns-claim-dropdown-button-item"
            onClick={() => handleItemClick('dns_claim')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <Globe className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            Create DNS Claim
          </button>

          {user_profile?.enable_dba_claim ? (<button
            data-testid="create-dns-claim-dropdown-button-item"
            onClick={() => handleItemClick('dba_claim')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <Scale className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            Create DBA Claim
          </button>) : null}




          <button
            data-testid="create-signature-claim-dropdown-button-item"
            onClick={() => handleItemClick('user_signature')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <Signature className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            Create Signature
          </button>

          <button
            data-testid="create-email-claim-dropdown-button-item"
            onClick={() => handleItemClick('email_claim')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <Mail className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            Create Email Claim
          </button>



          <button
            data-testid="create-phone-number-claim-dropdown-button-item"
            onClick={() => handleItemClick('phone_number_claim')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <Phone className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            Create Phone Number claim
          </button>



          <button
            data-testid="create-phone-number-claim-dropdown-button-item"
            onClick={() => handleItemClick('aqua_certificate')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <FileCheck className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
            Create certificate/proof claim
          </button>



          <button
            data-testid="create-phone-number-claim-dropdown-button-item"
            onClick={() => handleItemClick('identity_card')}
            className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <Blinds className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
            Create Identity card
          </button>

          {isAdmin && (
            <button
              data-testid="create-phone-number-claim-dropdown-button-item"
              onClick={() => handleItemClick('aquafier_licence')}
              className="group flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <FaCertificate className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Create Aquafier Licence
            </button>
          )}
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <div className="relative inline-block text-left">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block" ref={buttonRef}>
              <Button
                type="button"
                disabled={filesRemaining <= 0}
                className="flex items-center gap-1 sm:gap-2 text-white px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium hover:bg-gray-700 transition-colors cursor-pointer whitespace-nowrap shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleToggle}
                style={{ backgroundColor: '#3A5BF8' }}
                aria-expanded={isOpen}
                aria-haspopup="true"
                data-testid="create-claim-dropdown-button"
              >
                <Plus className="w-4 h-4" />
                Create Claim
                <ChevronDown
                  className={`h-4 w-4 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </Button>
            </div>
          </TooltipTrigger>
          {filesRemaining <= 0 && (
            <TooltipContent>
              <p>Usage limit reached. Upgrade to Pro to create more claims.</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}