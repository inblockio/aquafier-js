import Dexie, { Table } from 'dexie';

// Aqua system names interface
export interface AquaSystemName {
  id?: number;
  name: string;
  lastUpdated: number;
}

export class AquaSystemNamesDatabase extends Dexie {
  systemNames!: Table<AquaSystemName>;

  constructor() {
    super('AquaSystemNamesDatabase');
    
    this.version(1).stores({
      systemNames: '++id, name, lastUpdated'
    });
  }
}

export const aquaSystemNamesDB = new AquaSystemNamesDatabase();

export class AquaSystemNamesService {
  private static instance: AquaSystemNamesService;
  
  static getInstance(): AquaSystemNamesService {
    if (!AquaSystemNamesService.instance) {
      AquaSystemNamesService.instance = new AquaSystemNamesService();
    }
    return AquaSystemNamesService.instance;
  }

  // Save system names to database
  async saveSystemNames(names: string[]): Promise<void> {
    // Remove duplicates from input array
    const uniqueNames = [...new Set(names)];
    
    const systemNames: AquaSystemName[] = uniqueNames.map(name => ({
      name,
      lastUpdated: Date.now()
    }));
    
    // Clear existing names and add new ones
    await aquaSystemNamesDB.systemNames.clear();
    await aquaSystemNamesDB.systemNames.bulkAdd(systemNames);
  }

  // Get all system names
  async getSystemNames(): Promise<string[]> {
    const systemNames = await aquaSystemNamesDB.systemNames.toArray();
    return systemNames.map(item => item.name);
  }

  // Check if we have cached system names
  async hasCachedNames(): Promise<boolean> {
    const count = await aquaSystemNamesDB.systemNames.count();
    return count > 0;
  }

  // Clear all system names
  async clear(): Promise<void> {
    await aquaSystemNamesDB.systemNames.clear();
  }

  // Legacy method name for backward compatibility
  async clearSystemNames(): Promise<void> {
    return this.clear();
  }
}