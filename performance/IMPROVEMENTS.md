# Performance Improvement Suggestions

## 1. DNS Claim verification caching

We could improve performance of dns claim verification by caching the result of the verification for a given dns claim. This way, we only request for verification when a given period ellapses otherwise load the verification and verification status right from the db.

```typescript
    // Db Entry
    {
        domain: "example.com",
        walletAddress: "0xFeDc67e69ABa2310...",
        verificationStatus: "verified",
        verificationLogs: [],
        verificationTimestamp: "2025-10-30T17:49:52-03:00", // When the verification was done. Will be updated when the verification is re-requested
    }
```

In the function that requests for verification, we should check if the verification is already cached and if it is, we should return it. If it is not, we should request for verification and cache it.
