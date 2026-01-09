export interface AquaNameWithHash {
      name: string
      hash: string
}
export interface AquaJsonInZip {
      type: "aqua_workspace_backup" | "aqua_file_backup",
                        version: string,
                        createdAt: string,
      genesis: string
      name_with_hash: Array<AquaNameWithHash>
}
