import { useState, useEffect } from 'react';
import { ContactProfile } from '@/types/types';
import { ContactsService, contactsDB } from '@/storage/databases/contactsDb';
import { liveQuery } from 'dexie';

export const useContactResolver = () => {
  const contactsService = ContactsService.getInstance();

  // Resolve a single address to contact info
  const resolveAddress = async (walletAddress: string): Promise<ContactProfile | null> => {
    try {
      const contact = await contactsService.getContactByAddress(walletAddress);
      return contact || null;
    } catch (error) {
      console.error('Error resolving address:', error);
      return null;
    }
  };

  // Get display name for an address
  const getDisplayName = async (walletAddress: string): Promise<string> => {
    const contact = await resolveAddress(walletAddress);
    if (contact?.name) {
      return contact.name;
    }
    // Return truncated address if no name found
    return walletAddress.length > 14 
      ? `${walletAddress.slice(0, 10)}…${walletAddress.slice(-6)}`
      : walletAddress;
  };

  // Search contacts
  const searchContacts = async (query: string): Promise<ContactProfile[]> => {
    try {
      if (!query.trim()) {
        return await contactsService.getAllContacts();
      }
      return await contactsService.searchContacts(query);
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  };

  return {
    resolveAddress,
    getDisplayName,
    searchContacts
  };
};

// Hook for getting all contacts with live updates
export const useContacts = () => {
  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use liveQuery to watch for database changes
    const subscription = liveQuery(() => contactsDB.contacts.toArray()).subscribe({
      next: (result) => {
        setContacts(result);
        setLoading(false);
      },
      error: (error) => {
        console.error('Error loading contacts:', error);
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  const refreshContacts = () => {
    // With liveQuery, manual refresh is not needed as it automatically updates
    // But we can keep this for backward compatibility
    setLoading(true);
  };

  return {
    contacts,
    loading,
    refreshContacts
  };
};
