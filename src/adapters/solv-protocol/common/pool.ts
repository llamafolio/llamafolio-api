import type { BaseContext, Contract } from '@lib/adapter'
import type { Chain } from '@lib/chains'

const chain: { [key: number]: Chain } = {
  1: 'ethereum',
  56: 'bsc',
  137: 'polygon',
  42161: 'arbitrum',
}

export async function getSolvContracts(ctx: BaseContext): Promise<Contract[]> {
  const URL = 'https://token-list.solv.finance/vouchers-prod.json'

  const { tokens }: any = await fetch(URL).then((res) => res.json())

  const pools: Contract[] = tokens.map((data: any) => {
    const { address, symbol, chainId, tags, extensions } = data
    const { voucher } = extensions
    const { underlyingToken } = voucher

    const underlyings = underlyingToken ? [{ ...underlyingToken, chain: chain[underlyingToken.chainId] }] : undefined
    const vestingPool = voucher.vestingPool ? voucher.vestingPool : undefined

    return {
      chain: chain[chainId],
      address,
      symbol,
      decimals: 1,
      tags,
      underlyings,
      vestingPool,
    }
  })

  return pools.filter((pool) => pool.chain === ctx.chain && pool.tags.includes('vesting'))
}
