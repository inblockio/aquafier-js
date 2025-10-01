/**
 * Utils Index
 * Central export point for all utility functions
 *
 * This file provides backward compatibility while utilities are being refactored
 * into smaller, focused modules.
 *
 * USAGE:
 * - Existing code: `import { someFunction } from '@/utils/functions'` (works as before)
 * - New code: `import { someFunction } from '@/utils/date-time.utils'` (preferred)
 * - Or: `import { someFunction } from '@/utils'` (re-exports from functions.ts)
 */

// Re-export everything from the original functions file for backward compatibility
export * from './functions'

// New modular utilities are available for direct import:
// import { formatDate } from '@/utils/date-time.utils'
// import { capitalizeWords } from '@/utils/string.utils'
// import { formatCryptoAddress } from '@/utils/crypto.utils'
// import { getCookie, setCookie } from '@/utils/cookie.utils'
// import { areArraysEqual } from '@/utils/array.utils'
// import { ensureDomainUrlHasSSL } from '@/utils/url.utils'
// import { blobToBase64 } from '@/utils/conversion.utils'
// import { copyToClipboardModern } from '@/utils/ui.utils'
// import { getCurrentNetwork } from '@/utils/network.utils'

// TODO: Continue refactoring functions.ts into these modules:
// - file.utils.ts - File operations (reading, writing, type detection)
// - aqua-tree.utils.ts - AquaTree specific operations
// - api.utils.ts - API/fetch operations
// - dns.utils.ts - DNS and proof utilities
// - workflow.utils.ts - Workflow specific operations
