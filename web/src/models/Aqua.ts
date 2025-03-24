export interface AquaNameWithHash {
    name: string,
    hash: string
  }
  export interface AquaJsonInZip {
    genesis: string,
    name_with_hash: Array<AquaNameWithHash>
  }