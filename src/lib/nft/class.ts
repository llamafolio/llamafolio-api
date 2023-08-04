import type { Chain } from '@lib/chains'
import type { Address } from 'viem'

export abstract class UserNFTs {
  constructor(
    public readonly walletAddress: Address,
    public readonly chain: Chain,
  ) {}

  abstract fetch(): Promise<void>
}
