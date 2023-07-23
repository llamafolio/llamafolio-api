import type { Address } from 'viem'

export abstract class UserNFTs {
  abstract address: Address
  abstract chain: string

  abstract fetchUserNFTs(): Promise<{
    totalQuantity: number
    nfts: Array<any>
  }>
}
