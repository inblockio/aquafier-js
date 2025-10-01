# Utils Refactoring Guide

## Overview

The `functions.ts` file (2805 lines, 85 exported functions) is being refactored into smaller, focused utility modules to improve:
- **Maintainability** - Easier to find and modify specific utilities
- **Testability** - Smaller files are easier to unit test
- **Code organization** - Related functions grouped together
- **Import clarity** - Clear indication of what utilities you're using

## Current Status

### ✅ Completed Modules

The following utility modules have been created and are ready to use:

#### 1. `date-time.utils.ts` - Date and Time Operations
```typescript
import { formatDate, timeToHumanFriendly, displayTime } from '@/utils/date-time.utils'
```
- `formatDate()` - Format Date object to readable string
- `timeStampToDateObject()` - Convert timestamp string to Date
- `formatUnixTimestamp()` - Format Unix timestamp to readable string
- `timeToHumanFriendly()` - Convert various timestamp formats to human-friendly display
- `displayTime()` - Display time from number or string input

#### 2. `string.utils.ts` - String Manipulation
```typescript
import { capitalizeWords, makeProperReadableWord } from '@/utils/string.utils'
```
- `capitalizeWords()` - Capitalize each word in a string
- `convertTemplateNameToTitle()` - Convert underscore_case to Title Case
- `makeProperReadableWord()` - Convert underscore_case to Proper Readable Words
- `remove0xPrefix()` - Remove '0x' prefix from hex strings

#### 3. `crypto.utils.ts` - Ethereum Address Operations
```typescript
import { formatCryptoAddress, isValidEthereumAddress } from '@/utils/crypto.utils'
```
- `formatCryptoAddress()` - Shorten address for display (0x1234...5678)
- `isValidEthereumAddress()` - Validate Ethereum address
- `getValidChecksumAddress()` - Get checksummed version of address

#### 4. `cookie.utils.ts` - Browser Cookie Management
```typescript
import { getCookie, setCookie } from '@/utils/cookie.utils'
```
- `getCookie()` - Get cookie value by name
- `setCookie()` - Set cookie with expiration

#### 5. `array.utils.ts` - Array Operations
```typescript
import { areArraysEqual, getHighestFormIndex } from '@/utils/array.utils'
```
- `areArraysEqual()` - Compare two arrays for equality
- `arraysEqualIgnoreOrder()` - Compare arrays ignoring order
- `getHighestCount()` - Get highest number from underscore-suffixed strings
- `getHighestFormIndex()` - Extract highest form index from object keys

#### 6. `url.utils.ts` - URL Manipulation
```typescript
import { ensureDomainUrlHasSSL, isValidUrl } from '@/utils/url.utils'
```
- `ensureDomainUrlHasSSL()` - Ensure URL uses HTTPS (with localhost handling)
- `convertToWebsocketUrl()` - Convert HTTP(S) URL to WS(S)
- `isValidUrl()` - Validate URL format
- `isHttpUrl()` - Check if URL uses HTTP/HTTPS protocol
- `getFileHashFromUrl()` - Extract file hash from URL
- `extractFileHash()` - Extract hash from URL path

#### 7. `conversion.utils.ts` - Data Format Conversion
```typescript
import { blobToBase64, fileToBase64 } from '@/utils/conversion.utils'
```
- `blobToBase64()` - Convert Blob to base64 string
- `blobToDataURL()` - Convert Blob to data URL
- `dataURLToFile()` - Convert data URL to File object
- `dataURLToUint8Array()` - Convert data URL to Uint8Array
- `fileToBase64()` - Convert File to base64 string
- `encodeFileToBase64()` - Encode File to base64 with data URL prefix

#### 8. `ui.utils.ts` - UI Helper Functions
```typescript
import { copyToClipboardModern, humanReadableFileSize } from '@/utils/ui.utils'
```
- `copyToClipboardModern()` - Copy text to clipboard
- `generateAvatar()` - Generate Jdenticon avatar SVG
- `formatBytes()` - Format bytes to human-readable size (with binary/decimal option)
- `humanReadableFileSize()` - Format file size to readable string
- `getRandomNumber()` - Generate random number in range

#### 9. `network.utils.ts` - Ethereum Network Operations
```typescript
import { getCurrentNetwork, switchNetwork } from '@/utils/network.utils'
```
- `getCurrentNetwork()` - Get current MetaMask network chain ID
- `switchNetwork()` - Switch MetaMask to different network

## Usage Patterns

### Backward Compatible (Existing Code)
All existing imports continue to work:
```typescript
// Still works - imports from functions.ts via index.ts
import { formatDate } from '@/utils/functions'
import { formatDate } from '@/utils'
```

### Recommended (New Code)
Use specific utility modules for clearer intent:
```typescript
// Preferred - directly from utility module
import { formatDate } from '@/utils/date-time.utils'
import { capitalizeWords } from '@/utils/string.utils'
import { isValidEthereumAddress } from '@/utils/crypto.utils'
```

## TODO: Remaining Refactoring

The following categories still need to be extracted from `functions.ts`:

### 1. File Operations (`file.utils.ts`)
Functions for file reading, writing, and type detection:
- `readFileAsText()`, `readFileAsArrayBuffer()`, `readFileAsDataURL()`
- `getFileCategory()`, `fileType()`, `getFileExtension()`
- `calculateContentSize()`, `estimateFileSize()`, `estimateStringFileSize()`
- `isTextFile()`, `isArrayBufferText()`, `determineFileType()`
- `checkIfFileExistInUserFiles()`, `readFileContent()`
- `readJsonFile()`, `isJSONFile()`, `isZipFile()`, `isJSONKeyValueStringContent()`

### 2. AquaTree Operations (`aqua-tree.utils.ts`)
Functions specific to AquaTree data structures:
- `getAquaTreeFileName()`, `getAquaTreeFileObject()`, `getFileName()`
- `getGenesisHash()`, `validateAquaTree()`, `isAquaTree()`
- `getLastRevisionVerificationHash()`, `filterFilesByType()`
- `allLinkRevisionHashes()`, `isWorkFlowData()`
- `getFileNameWithDeepLinking()`, `isDeepLinkRevision()`, `fetchLinkedFileName()`
- `getLatestApiFileInfObject()`

### 3. API/Fetch Operations (`api.utils.ts`)
Functions for API calls and data fetching:
- `fetchFiles()`, `fetchSystemFiles()`, `fetchFileData()`
- `fetchImage()`, `handleLoadFromUrl()`
- `loadSignatureImage()`
- `fetchWalletAddressesAndNamesForInputRecommendation()`

### 4. DNS & Proof (`dns.utils.ts`)
DNS verification and proof generation:
- `generateProofFromSignature()`, `formatTxtRecord()`
- `digTxtRecords()`, `digTxtRecordsGoogle()`
- `extractDNSClaimInfo()`

### 5. Workflow Operations (`workflow.utils.ts`)
Workflow-specific business logic:
- `getWalletClaims()`, `processContractInformation()`
- `processSimpleWorkflowClaim()`

### 6. Test/Dummy Data (`test.utils.ts`)
Test helpers and dummy data generators:
- `dummyCredential()`

## Migration Strategy

When refactoring a category:

1. **Create the new utility file** (e.g., `file.utils.ts`)
2. **Copy functions** from `functions.ts` to the new file
3. **Add proper TypeScript types** and JSDoc comments
4. **Write unit tests** for the functions
5. **Update imports** in components that use those functions
6. **Remove functions** from `functions.ts` once fully migrated
7. **Update this guide** with the new module

## Testing

Each utility module should have corresponding unit tests:

```bash
# Create test file
touch web/src/utils/__tests__/date-time.utils.test.ts

# Run tests
cd web
npm test
```

Example test structure:
```typescript
import { describe, it, expect } from 'vitest'
import { formatDate, timeToHumanFriendly } from '../date-time.utils'

describe('date-time.utils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-01-15')
      expect(formatDate(date)).toBe('15-Jan-2025')
    })
  })
})
```

## Benefits of This Refactoring

1. **Easier to Find Functions** - Clear categories instead of scrolling through 2805 lines
2. **Better for Testing** - Can test individual modules in isolation
3. **Improved Type Safety** - Each module can have focused type definitions
4. **Clearer Dependencies** - Easy to see what utilities depend on external packages
5. **Better Code Review** - Smaller files are easier to review
6. **Facilitates Tree Shaking** - Bundler can better eliminate unused code

## Notes

- Original `functions.ts` remains unchanged for now (backward compatibility)
- New utility modules can coexist with `functions.ts`
- Gradual migration is recommended to avoid breaking changes
- Update CLAUDE.md when major refactoring milestones are reached
