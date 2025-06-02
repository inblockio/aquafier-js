// export interface FileInfo {
//     id: number;
//     name: string;
//     extension: string;
//     page_data: string;
// }

// export interface HashChain {
//     genesis_hash: string;
//     domain_id: string;
//     title: string;
//     DateFormatter: any // Not sute about this field! Does it exist
//     namespace: number;
//     chain_height: number;
//     revisions: Record<string, Revision>;  // Changed from Array<[string, Revision]>
// }

export interface StructuredMerkleProof {
    left_leaf: string;
    right_leaf: string;
    successor: string;
}

// export interface RevisionWitness {
//     domain_snapshot_genesis_hash: string;
//     merkle_root: string;
//     witness_network: string;
//     witness_event_transaction_hash: string;
//     witness_event_verification_hash: string;
//     witness_hash: string;
//     structured_merkle_proof: StructuredMerkleProof[];
// }

// export interface RevisionSignature {
//     signature: string;
//     public_key: string;
//     signature_hash: string;
//     wallet_address: string;
// }

// export interface Revision {
//     content: RevisionContent;
//     metadata: RevisionMetadata;
//     signature: RevisionSignature | null;
//     witness: RevisionWitness | null;
// }

export interface RevisionContent {
    file: FileContent | null;
    content: {
        file_hash?: string;
        [key: string]: string | undefined;
    };
    content_hash: string;
}

export interface FileContent {
    data: string;  // Base64 encoded string
    filename: string;
    size: number;
    comment: string;
}

export interface RevisionMetadata {
    domain_id: string;
    time_stamp: string,//Timestamp, //string;  // Changed from Timestamp object to string
    previous_verification_hash: string | null;
    metadata_hash: string;
    verification_hash: string;
    merge_hash: string | null
}

export interface Timestamp {
    seconds: number;
    nanos: number;
}

// export interface PageData {
//     pages: HashChain[];
// }


// Method 1: Direct access when you're sure of the structure
// export function getTimestampDirect(pageData: PageData): string | undefined {
//     if (pageData.pages.length > 0) {
//         const firstPage = pageData.pages[0];
//         const firstRevisionKey = Object.keys(firstPage.revisions)[0];
//         return firstPage.revisions[firstRevisionKey].metadata.time_stamp;
//     }
//     return undefined;
// }

// Method 2: Safe access with optional chaining
// export function getTimestampSafe(pageData: PageData): string | undefined {
//     return pageData.pages[0]?.revisions[Object.keys(pageData.pages[0]?.revisions || {})[0]]?.metadata.time_stamp;
// }
