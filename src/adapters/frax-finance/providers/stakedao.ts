import type { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { ETH_ADDR } from '@lib/token'
import { isSuccess } from '@lib/type'
import { ethers } from 'ethers'

const abi = {
  get_pool_from_lp_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  get_underlying_coins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
  },
  curveLPToken: {
    inputs: [],
    name: 'curveLPToken',
    outputs: [{ internalType: 'contract ICurve', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export const stakedaoProvider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const res: Contract[] = []

  const curveLpTokensRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({
      target: pool.lpToken,
    })),
    abi: abi.curveLPToken,
  })

  const curvePoolsRes = await multicall({
    ctx,
    calls: curveLpTokensRes.map((lpToken) => ({
      target: metaRegistry.address,
      params: [isSuccess(lpToken) ? lpToken.output : null],
    })),
    abi: abi.get_pool_from_lp_token,
  })

  const underlyingsRes = await multicall({
    ctx,
    calls: curvePoolsRes.map((poolAddress) => ({
      target: metaRegistry.address,
      params: [isSuccess(poolAddress) ? poolAddress.output : null],
    })),
    abi: abi.get_underlying_coins,
  })

  pools.forEach((pool, idx) => {
    const curveLpToken = curveLpTokensRes[idx]
    const curvePoolRes = curvePoolsRes[idx]
    const underlyingRes = underlyingsRes[idx]

    res.push({
      ...pool,
      curveLpToken: curveLpToken.output,
      curvePool: curvePoolRes.output,
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
