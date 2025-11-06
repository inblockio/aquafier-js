import Dexie, { Table } from 'dexie';
import { ContactProfile } from '@/types/types';

export class ContactsDatabase extends Dexie {
  contacts!: Table<ContactProfile>;

  constructor() {
    super('ContactsDatabase');
    
    this.version(1).stores({
      contacts: 'walletAddress, name, email, phone'
    });
  }
}

export const contactsDB = new ContactsDatabase();

export class ContactsService {
  private static instance: ContactsService;
  
  static getInstance(): ContactsService {
    if (!ContactsService.instance) {
      ContactsService.instance = new ContactsService();
    }
    return ContactsService.instance;
  }

  // Bulk add/upsert contacts by wallet address
  async bulkUpsertContacts(contacts: ContactProfile[]): Promise<void> {
    await contactsDB.contacts.bulkPut(contacts);
  }

  // Get contact by wallet address
  async getContactByAddress(walletAddress: string): Promise<ContactProfile | undefined> {
    return await contactsDB.contacts.get(walletAddress);
  }

  // Get all contacts
  async getAllContacts(): Promise<ContactProfile[]> {
    return await contactsDB.contacts.toArray();
  }

  // Search contacts
  async searchContacts(query: string): Promise<ContactProfile[]> {
    const lowerQuery = query.toLowerCase();
    return await contactsDB.contacts
      .filter(contact => {
        const searchText = `${contact.name || ''} ${contact.walletAddress || ''} ${contact.phone || ''} ${contact.email || ''} ${contact.searchString || ''}`.toLowerCase();
        return searchText.includes(lowerQuery);
      })
      .toArray();
  }

  // Clear all contacts
  async clear(): Promise<void> {
    await contactsDB.contacts.clear();
  }
}