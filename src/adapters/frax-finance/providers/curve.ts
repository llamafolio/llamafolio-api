import type { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { ETH_ADDR } from '@lib/token'
import { ethers } from 'ethers'

const abi = {
  get_underlying_coins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
  },
}

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export const curveProvider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const res: Contract[] = []

  const underlyingsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({
      target: metaRegistry.address,
      params: [pool.curvePool],
    })),
    abi: abi.get_underlying_coins,
  })

  pools.forEach((pool, idx) => {
    const underlyingRes = underlyingsRes[idx]

    res.push({
      ...pool,
      curveLpToken: pool.curvePool,
      underlyings: underlyingRes.output
        .map((address: string) => address.toLowerCase())
        // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
        .filter((address: string) => address !== ethers.constants.AddressZero)
        // replace ETH alias
        .map((address: string) => (address === ETH_ADDR ? ethers.constants.AddressZero : address)),
    })
  })

  return res
}
