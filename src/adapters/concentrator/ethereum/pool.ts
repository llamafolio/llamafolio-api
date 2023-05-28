import type { BaseContext, Contract } from '@lib/adapter'
import { rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { ADDRESS_ZERO } from '@lib/contract'
import { multicall } from '@lib/multicall'
import { ETH_ADDR } from '@lib/token'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'uint128', name: 'totalUnderlying', type: 'uint128' },
      { internalType: 'uint128', name: 'totalShare', type: 'uint128' },
      { internalType: 'uint256', name: 'accRewardPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'convexPoolId', type: 'uint256' },
      { internalType: 'address', name: 'lpToken', type: 'address' },
      { internalType: 'address', name: 'crvRewards', type: 'address' },
      {
        internalType: 'uint256',
        name: 'withdrawFeePercentage',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'platformFeePercentage',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'harvestBountyPercentage',
        type: 'uint256',
      },
      { internalType: 'bool', name: 'pauseDeposit', type: 'bool' },
      { internalType: 'bool', name: 'pauseWithdraw', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolFromLPToken: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 2443,
  },
  getUnderlyingsCoins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
  },
  poolInfoOld: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      {
        components: [
          { internalType: 'uint128', name: 'totalUnderlying', type: 'uint128' },
          { internalType: 'uint128', name: 'totalShare', type: 'uint128' },
        ],
        internalType: 'struct ConcentratorGeneralVault.PoolSupplyInfo',
        name: 'supply',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'address', name: 'strategy', type: 'address' },
          { internalType: 'bool', name: 'pauseDeposit', type: 'bool' },
          { internalType: 'bool', name: 'pauseWithdraw', type: 'bool' },
        ],
        internalType: 'struct ConcentratorGeneralVault.PoolStrategyInfo',
        name: 'strategy',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint128', name: 'rate', type: 'uint128' },
          { internalType: 'uint32', name: 'periodLength', type: 'uint32' },
          { internalType: 'uint48', name: 'lastUpdate', type: 'uint48' },
          { internalType: 'uint48', name: 'finishAt', type: 'uint48' },
          { internalType: 'uint256', name: 'accRewardPerShare', type: 'uint256' },
        ],
        internalType: 'struct ConcentratorGeneralVault.PoolRewardInfo',
        name: 'reward',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint32', name: 'withdrawFeeRatio', type: 'uint32' },
          { internalType: 'uint32', name: 'platformFeeRatio', type: 'uint32' },
          { internalType: 'uint32', name: 'harvestBountyRatio', type: 'uint32' },
          { internalType: 'uint160', name: 'reserved', type: 'uint160' },
        ],
        internalType: 'struct ConcentratorGeneralVault.PoolFeeInfo',
        name: 'fee',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getPoolsContracts(ctx: BaseContext, contracts: Contract[]): Promise<Contract[]> {
  const pools: Contract[] = []

  for (const contract of contracts) {
    const poolsCountBI = await call({ ctx, target: contract.address, abi: abi.poolLength })
    const poolsCount = Number(poolsCountBI)

    const poolInfosRes = await multicall({
      ctx,
      calls: rangeBI(0n, poolsCountBI).map((i) => ({ target: contract.address, params: [i] } as const)),
      abi: abi.poolInfo,
    })

    for (let idx = 0; idx < poolsCount; idx++) {
      const poolInfoRes = poolInfosRes[idx]
      if (!poolInfoRes.success) {
        continue
      }

      const [_totalUnderlying, _totalShare, _accRewardPerShare, convexPoolId, lpToken, crvRewards] = poolInfoRes.output
      pools.push({
        chain: ctx.chain,
        address: lpToken,
        pid: idx,
        convexPoolId,
        lpToken,
        crvRewards,
        vaultName: contract.name,
        vaultAddress: poolInfoRes.input.target,
        rewards: contract.rewards,
      })
    }

    const poolsAddressesRes = await multicall({
      ctx,
      calls: pools.map(({ address }) => ({ target: metaRegistry.address, params: [address] } as const)),
      abi: abi.getPoolFromLPToken,
    })

    for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
      const pool = pools[poolIdx]
      const poolAddressRes = poolsAddressesRes[poolIdx]
      if (!poolAddressRes.success) {
        continue
      }

      pool.pool = poolAddressRes.output
    }

    const underlyingsRes = await multicall({
      ctx,
      calls: pools.map(({ pool }) => ({ target: metaRegistry.address, params: [pool] } as const)),
      abi: abi.getUnderlyingsCoins,
    })

    for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
      const pool = pools[poolIdx]
      const underlyingRes = underlyingsRes[poolIdx]
      if (!underlyingRes.success) {
        continue
      }

      pool.underlyings = underlyingRes.output
        .map((address) => address.toLowerCase())
        // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
        .filter((address) => address !== ADDRESS_ZERO)
        // replace ETH alias
        .map((address) => (address === ETH_ADDR ? ADDRESS_ZERO : address))
    }
  }

  return pools
}

export async function getOldContracts(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const poolsCountBI = await call({ ctx, target: contract.address, abi: abi.poolLength })
  const poolsCount = Number(poolsCountBI)

  const poolInfosRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolsCountBI).map((i) => ({ target: contract.address, params: [i] } as const)),
    abi: abi.poolInfoOld,
  })

  for (let idx = 0; idx < poolsCount; idx++) {
    const poolInfoRes = poolInfosRes[idx]
    if (!poolInfoRes.success) {
      continue
    }

    pools.push({
      chain: ctx.chain,
      address: poolInfoRes.output[1].token,
      lpToken: poolInfoRes.output[1].token,
      pid: idx,
      vaultName: contract.name,
      vaultAddress: poolInfoRes.input.target,
      rewards: contract.rewards,
    })
  }

  const poolsAddressesRes = await multicall({
    ctx,
    calls: pools.map(({ address }) => ({ target: metaRegistry.address, params: [address] } as const)),
    abi: abi.getPoolFromLPToken,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const poolAddressRes = poolsAddressesRes[poolIdx]
    if (!poolAddressRes.success) {
      continue
    }

    pool.pool = poolAddressRes.output
  }

  const underlyingsRes = await multicall({
    ctx,
    calls: pools.map(({ pool }) => ({ target: metaRegistry.address, params: [pool] } as const)),
    abi: abi.getUnderlyingsCoins,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyingRes = underlyingsRes[poolIdx]
    if (!underlyingRes.success) {
      continue
    }

    pool.underlyings = underlyingRes.output
      .map((address) => address.toLowerCase())
      // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
      .filter((address) => address !== ADDRESS_ZERO)
      // replace ETH alias
      .map((address) => (address === ETH_ADDR ? ADDRESS_ZERO : address))
  }

  return pools
}
