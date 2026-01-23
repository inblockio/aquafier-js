# Aquafier Reload System

This system uses Dexie.js (IndexedDB) and React hooks to implement global reload functionality across different sections of the application.

## How it works

1. **IndexedDB Storage**: Reload flags are stored in IndexedDB using Dexie.js
2. **React Hooks**: Components watch for changes using `useLiveQuery` from dexie-react-hooks
3. **Automatic Triggers**: When workflows are created/updated, reload flags are set
4. **Component Reloads**: Components automatically reload their data when flags change

## Usage Examples

### 1. Watching for reloads in a component

```tsx
import { useReloadWatcher } from '@/hooks/useReloadWatcher';
import { RELOAD_KEYS } from '@/utils/reloadDatabase';

const MyWorkflowComponent = () => {
  const loadData = async () => {
    // Your data loading logic here
  };

  // Watch for reload triggers
  useReloadWatcher({
    key: RELOAD_KEYS.aqua_sign, // or any other key
    onReload: () => {
      console.log('Reloading data...');
      loadData();
    }
  });

  return <div>Your component JSX</div>;
};
```

### 2. Triggering reloads after workflow creation

```tsx
import { triggerWorkflowReload } from '@/utils/reloadDatabase';

const createWorkflow = async () => {
  // Create your workflow...
  
  // Trigger reload for specific workflow type only
  await triggerWorkflowReload('aqua_sign');
  
  // Trigger reload for workflow type AND automatically reload stats
  await triggerWorkflowReload('aqua_sign', true);
};
```

### 3. Automatic stats reload

When `watchAll` is set to `true`, the system automatically triggers `user_stats` reload:

```tsx
// This will reload aqua_sign workflows AND user stats
await triggerWorkflowReload('aqua_sign', true);

// Watch for stats changes in any component
useReloadWatcher({
  key: RELOAD_KEYS.user_stats,
  onReload: () => {
    console.log('Reloading user stats...');
    getUserStats();
  }
});
```

### 4. Dynamic reload keys based on workflow type

```tsx
// In WorkflowSpecificTable component
const getReloadKey = (workflowName: string): string => {
  if (workflowName === 'all') return RELOAD_KEYS.all_files;
  if (workflowName === 'user_files') return RELOAD_KEYS.user_files;
  
  // Use workflow name as key if it exists in RELOAD_KEYS
  const reloadKey = (RELOAD_KEYS as any)[workflowName];
  return reloadKey || workflowName;
};

useReloadWatcher({
  key: getReloadKey(workflowName),
  onReload: () => loadFiles()
});
```

## Available Reload Keys

```typescript
export const RELOAD_KEYS = {
  access_agreement: "access_agreement",
  aqua_sign: "aqua_sign",
  cheque: "cheque",
  dba_claim: "dba_claim",
  identity_attestation: "identity_attestation",
  identity_claim: "identity_claim",
  user_signature: "user_signature",
  domain_claim: "domain_claim",
  email_claim: "email_claim",
  phone_number_claim: "phone_number_claim",
  user_profile: "user_profile",
  user_files: "user_files",        // Custom: all aqua files
  all_files: "all_files",          // Custom: all user files
  notifications: "notifications",
  claims_and_attestations: "claims_and_attestations",
  user_stats: "user_stats"         // User statistics
};
```

## Special Cases

- **user_files** and **all_files**: Custom file views that don't correspond to specific workflow types
- **Identity Claims**: When identity claims are created, both the specific claim type and `claims_and_attestations` are triggered
- **Automatic Stats Reload**: When `watchAll: true` is used, `user_stats` is automatically triggered
- **Automatic Grouping**: The system automatically handles related reloads (e.g., identity claims also trigger the claims page)

## Benefits

1. **Decoupled**: Components don't need to know about each other
2. **Persistent**: Reload flags survive page refreshes
3. **Efficient**: Only components watching specific keys reload
4. **Automatic**: No manual coordination needed between components
5. **Flexible**: Easy to add new workflow types and reload scenarios
