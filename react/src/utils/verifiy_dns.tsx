import { ReactNode } from "react"
import { ensureDomainUrlHasSSL } from "./functions"


interface LogEntry {
    level: 'info' | 'success' | 'warning' | 'error'
    message: string
    details?: any
  }


export interface VerificationResult {
    success: boolean
    message: string
    domain: string
    expectedWallet?: string
    totalRecords: number
    verifiedRecords: number
    results: any[]
    logs: LogEntry[]
    dnssecValidated: boolean
}

export type IDNSStatus = "loading" | "verified" | "failed" | "not_found"
export interface IDnsVerificationResult {
    status: string
    message: string
    dnsStatus: IDNSStatus
    verificationResult: VerificationResult | null
}

export const verifyDNS = async (backend_url: string, domain: string, walletAddress: string): Promise<IDnsVerificationResult> => {
    // Hardcoded values as requested
    //     const domain = 'inblock.io'
    //     const walletAddress = '0x677e5E9a3badb280d7393464C09490F813d6d6ef'

    const dnsVerificationResult: IDnsVerificationResult = {
        status: "loading",
        message: "Verifying...",
        dnsStatus: "loading",
        verificationResult: null,
    }

    try {
        dnsVerificationResult.status = "loading"
        dnsVerificationResult.message = "Verifying..."
        dnsVerificationResult.dnsStatus = "loading"
        dnsVerificationResult.verificationResult = null
        
        const url = `${backend_url}/verify/dns_claim`
        const actualUrlToFetch = ensureDomainUrlHasSSL(url)

        const response = await fetch(actualUrlToFetch, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domain: domain ?? "inblock.io",
                wallet: walletAddress
            }),
        })

        const result: VerificationResult = await response.json()

        dnsVerificationResult.verificationResult = result

        if (result.success) {
            dnsVerificationResult.dnsStatus = "verified"
            dnsVerificationResult.message = "Verified"
        } else {
            // Determine status based on the response status and result
            if (response.status === 404) {
                dnsVerificationResult.dnsStatus = "not_found"
                dnsVerificationResult.message = "Not found"
            } else if (response.status === 429) {
                dnsVerificationResult.dnsStatus = "failed"
                dnsVerificationResult.message = "Rate limited"
            } else if (response.status === 400) {
                dnsVerificationResult.dnsStatus = "failed"
                dnsVerificationResult.message = "Invalid request"
            } else if (response.status === 422) {
                dnsVerificationResult.dnsStatus = "failed"
                dnsVerificationResult.message = "Failed"
            } else {
                dnsVerificationResult.dnsStatus = "failed"
                dnsVerificationResult.message = "Failed"
            }
        }
    } catch (error) {
        dnsVerificationResult.status = "not loading"
        dnsVerificationResult.dnsStatus = "failed"
        dnsVerificationResult.message = "Connection error"
    }
    return dnsVerificationResult
}

export const getDNSStatusBadge = (dnsStatus: IDNSStatus, dnsMessage: string): ReactNode => {
    switch (dnsStatus) {
        case 'loading':
            return (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full w-fit flex items-center gap-1" >
                    <div className="animate-spin h-2 w-2 border border-blue-500 border-t-transparent rounded-full" > </div>
                    {dnsMessage}
                </span>
            )
        case 'verified':
            return (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full w-fit" >
                    ✓ {dnsMessage}
                </span>
            )
        case 'not_found':
            return (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full w-fit" >
                    ⚠ {dnsMessage}
                </span>
            )
        case 'failed':
        default:
            return (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full w-fit" >
                    ✗ {dnsMessage}
                </span>
            )
    }
}