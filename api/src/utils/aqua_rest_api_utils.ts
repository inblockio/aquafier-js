import { prisma } from '../database/db';
import { CatalogItem } from '../models/request_models';
import Logger from './logger';

/**
 * Verify that a user has access to a revision (either owns it or has shared access via Contract).
 * Returns the pubkey_hash if access is granted, or null if denied.
 */
export async function verifyRevisionAccess(
    userAddress: string,
    revisionHash: string
): Promise<{ pubkeyHash: string; isOwner: boolean } | null> {
    // Build the pubkey_hash for ownership check
    const pubkeyHash = `${userAddress}_${revisionHash}`;

    // Check direct ownership
    const ownedRevision = await prisma.revision.findFirst({
        where: { pubkey_hash: pubkeyHash }
    });

    if (ownedRevision) {
        return { pubkeyHash, isOwner: true };
    }

    // Fallback: check shared access via Contract table
    const contracts = await prisma.contract.findMany({
        where: {
            recipients: { has: userAddress.toLowerCase() }
        }
    });

    for (const contract of contracts) {
        // The contract's sender owns the revision — check with their address
        if (contract.sender) {
            const senderPubkeyHash = `${contract.sender}_${revisionHash}`;
            const sharedRevision = await prisma.revision.findFirst({
                where: { pubkey_hash: senderPubkeyHash }
            });
            if (sharedRevision) {
                return { pubkeyHash: senderPubkeyHash, isOwner: false };
            }
        }
    }

    return null;
}

/**
 * Build a CatalogItem for the /list endpoint.
 * If includeMetadata is true, enriches with file title, type, signature/witness presence.
 */
export async function buildCatalogItem(
    pubkeyHash: string,
    includeMetadata: boolean
): Promise<CatalogItem> {
    // Extract the revision hash from pubkey_hash (format: address_hash)
    const parts = pubkeyHash.split('_');
    const revisionHash = parts.length > 1 ? parts.slice(1).join('_') : pubkeyHash;

    const item: CatalogItem = { hash: revisionHash };

    if (!includeMetadata) {
        return item;
    }

    // Get file name
    const fileName = await prisma.fileName.findFirst({
        where: { pubkey_hash: pubkeyHash }
    });
    if (fileName) {
        item.title = fileName.file_name;
    }

    // Get revision for type
    const revision = await prisma.revision.findFirst({
        where: { pubkey_hash: pubkeyHash }
    });
    if (revision) {
        item.type = revision.revision_type ?? undefined;
    }

    // Check for signature
    const signature = await prisma.signature.findFirst({
        where: { hash: pubkeyHash }
    });
    item.has_signature = signature !== null;

    // Check for witness
    const witness = await prisma.witness.findFirst({
        where: { hash: pubkeyHash }
    });
    item.has_witness = witness !== null;

    return item;
}

/**
 * Parse a range parameter string like "bytes=0-1024" into start/end offsets.
 */
export function parseRangeParam(
    rangeStr: string,
    totalSize: number
): { start: number; end: number } | null {
    const match = rangeStr.match(/^bytes=(\d+)-(\d*)$/);
    if (!match) return null;

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

    if (isNaN(start) || start < 0 || start >= totalSize) return null;
    if (isNaN(end) || end < start || end >= totalSize) return null;

    return { start, end };
}

/**
 * Validate that a string is a valid 0x-prefixed SHA3-256 hash (66 chars).
 */
export function validateSha3Hash(hash: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

/**
 * Convert UNIX seconds to a Date object.
 */
export function unixSecondsToDate(seconds: number): Date {
    return new Date(seconds * 1000);
}

/**
 * Convert a Date object to UNIX seconds.
 */
export function dateToUnixSeconds(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}
