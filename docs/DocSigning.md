# Document Signing in Aqua Protocol

## Current Implementation and Challenge

In the Aqua Protocol, document signing is implemented as a revision-based system where signatures are stored as revisions in the blockchain. This approach provides excellent security and immutability, but presents a user experience challenge: **how to visibly link signatures to specific documents in a way that's intuitive for users who expect to see signatures directly on documents**.

Currently, the system:
1. Stores signatures in the database as separate entities linked to revisions
2. Handles media files and documents in a similar way through the revision system
3. Lacks a visual representation of signatures on documents that users typically expect

## Proposed Solution: Visual Signature Linking

To address this challenge while maintaining the integrity of the blockchain-based revision system, we propose implementing a "Visual Signature Linking" approach that bridges the gap between blockchain-based signatures and traditional document signing expectations.

### Core Components

1. **Signature Metadata Enhancement**
   - Extend the `Signature` model to include document-specific metadata:
     ```typescript
     {
       // Existing fields
       hash: string;
       signature_digest: string;
       signature_wallet_address: string;
       signature_public_key: string;
       signature_type: string;
       
       // New fields
       document_reference: string; // Reference to specific document/file hash
       signature_position: { x: number, y: number, page: number }; // Visual position data
       signature_appearance: string; // Visual style (text/image/stamp)
       signer_metadata: { name: string, title: string, timestamp: string }; // Human-readable info
     }
     ```

2. **Document-Signature Mapping Layer**
   - Create a new mapping table that explicitly links signatures to documents:
     ```typescript
     model DocumentSignature {
       id: string @id @default(uuid())
       document_hash: string      // Reference to the document file hash
       signature_hash: string     // Reference to the signature hash
       revision_hash: string      // Reference to the revision containing both
       position_data: Json?       // Visual positioning data
       timestamp: DateTime        // When the signature was applied
       
       @@unique([document_hash, signature_hash])
       @@map("document_signatures")
     }
     ```

3. **Signature Visualization Component**
   - Develop a front-end component that renders signatures on documents:
     - For PDF documents: Overlay signatures at specified positions
     - For images: Apply signature watermarks
     - For other file types: Provide a signature sidebar or header/footer

### Implementation Approach

1. **Document Signing Flow**
   - When a user signs a document:
     1. Create the signature record in the blockchain (current flow)
     2. Create the document-signature mapping with positioning data
     3. Generate a visual representation for immediate feedback

2. **Document Viewing Flow**
   - When a user views a document:
     1. Retrieve the document content (current flow)
     2. Query for associated signatures via the mapping layer
     3. Render the document with signature overlays at specified positions

3. **Signature Verification**
   - Enhance the verification UI to:
     1. Highlight the specific document being verified
     2. Show the signature details with visual indicators
     3. Provide a verification certificate that can be shared

### Technical Implementation Details

1. **API Enhancements**
   - Add endpoints for:
     - Associating signatures with specific documents
     - Retrieving signature metadata for a document
     - Updating signature visual properties

2. **Database Changes**
   - Implement the new mapping table
   - Add indexes for efficient signature-document lookups

3. **UI Components**
   - Develop a signature placement tool for the document viewer
   - Create signature visualization overlays for different document types
   - Build a signature verification panel

## Benefits

1. **Improved User Experience**: Users see signatures directly on documents as expected
2. **Maintained Blockchain Integrity**: The core blockchain-based signature system remains unchanged
3. **Flexible Visualization**: Different document types can have appropriate signature displays
4. **Enhanced Verification**: Clearer indication of what was signed and by whom
5. **Compatibility**: Works with the existing revision-based system

## Implementation Roadmap

1. **Phase 1: Database & API Enhancement**
   - Extend the database schema
   - Implement core API endpoints
   - Create basic signature-document association

2. **Phase 2: Visualization Components**
   - Develop document viewer with signature overlay
   - Implement signature placement UI
   - Create verification visualization

3. **Phase 3: Advanced Features**
   - Multiple signature support
   - Signature templates and styles
   - Batch signing workflows
   - Signature verification certificates
