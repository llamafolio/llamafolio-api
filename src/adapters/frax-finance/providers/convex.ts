import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { ADDRESS_ZERO } from '@lib/contract'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO, isZero } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { ETH_ADDR } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'

import type { ProviderBalancesParams } from './interface'

const abi = {
  convexPoolId: {
    inputs: [],
    name: 'convexPoolId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'address', name: 'lptoken', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'gauge', type: 'address' },
      { internalType: 'address', name: 'crvRewards', type: 'address' },
      { internalType: 'address', name: 'stash', type: 'address' },
      { internalType: 'bool', name: 'shutdown', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
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
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  getPricePerFullShare: {
    constant: true,
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

const convexBooster: Contract = {
  chain: 'ethereum',
  address: '0xF403C135812408BFbE8713b5A23a04b3D48AAE31',
}

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export const convexProvider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const res: Contract[] = []

  const poolIdsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.lpToken })),
    abi: abi.convexPoolId,
  })

  const curveLpTokensRes = await multicall({
    ctx,
    calls: poolIdsRes.map((poolId) => ({
      target: convexBooster.address,
      params: [isSuccess(poolId) ? poolId.output : null],
    })),
    abi: abi.poolInfo,
  })

  const curvePoolsRes = await multicall({
    ctx,
    calls: curveLpTokensRes.map((lpToken) => ({
      target: metaRegistry.address,
      params: [isSuccess(lpToken) ? lpToken.output.lptoken : null],
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
    const poolIdRes = poolIdsRes[idx]
    const curveLpToken = curveLpTokensRes[idx]
    const curvePoolRes = curvePoolsRes[idx]
    const underlyingRes = underlyingsRes[idx]

    res.push({
      ...pool,
      poolId: poolIdRes.output,
      curveLpToken: curveLpToken.output.lptoken,
      curvePool: curvePoolRes.output,
      underlyings: underlyingRes.output
        .map((address: string) => address.toLowerCase())
        // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
        .filter((address: string) => address !== ADDRESS_ZERO)
        // replace ETH alias
        .map((address: string) => (address === ETH_ADDR ? ADDRESS_ZERO : address)),
    })
  })

  return res
}

export const convexBalancesProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  for (const pool of pools) {
    if (pool.provider === 'curve') {
      const { output: pricePerShare } = await call({ ctx, target: pool.lpToken, abi: abi.getPricePerFullShare })
      pool.amount = pool.amount.mul(pricePerShare).div(utils.parseEther('1.0'))
    }
  }

  const underlyingsCalls: Call[] = pools.map((pool) => ({ target: metaRegistry.address, params: [pool.curvePool!] }))
  const suppliesCalls: Call[] = pools.map((pool: Contract) => ({ target: pool.curveLpToken }))

  const [underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({ ctx, calls: underlyingsCalls, abi: abi.get_underlying_balances }),
    multicall({ ctx, calls: suppliesCalls, abi: erc20Abi.totalSupply }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount } = pool
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (
      !underlyings ||
      !isSuccess(underlyingsBalanceRes) ||
      !isSuccess(totalSupplyRes) ||
      isZero(totalSupplyRes.output)
    ) {
      continue
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
      ;(underlying as Balance).amount =
        BigNumber.from(underlyingBalance).mul(amount).div(totalSupplyRes.output) || BN_ZERO
    })
  }

  return pools
}
