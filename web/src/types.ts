export interface Session {
      id: number
      address: string
      nonce: string
      issuedAt: string // ISO 8601 string format
      expirationTime: string // ISO 8601 string format
}

export interface ApiFileData {
      fileHash: string
      fileData: string | ArrayBuffer
}

// export type  dialogtypeData =  'form_template_editor' | 'aqua_file_details' | 'identity_claim' | 'dns_claim' | 'aqua_sign' | 'identity_attestation' | 'early_bird_offer' | 'user_signature'