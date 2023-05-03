import { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { isZero } from '@lib/math'
import { multicall } from '@lib/multicall'
import { ETH_ADDR, Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { ethers } from 'ethers'

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
  extraRewards: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'extraRewards',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  extraRewardsLength: {
    inputs: [],
    name: 'extraRewardsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const CRV: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  symbol: 'CRV',
  decimals: 18,
}

const CVX: Token = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  symbol: 'CVX',
  decimals: 18,
}

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getPoolsContracts(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const poolsCountRes = await call({ ctx, target: contract.address, params: [], abi: abi.poolLength })

  const poolsCount: number = parseInt(poolsCountRes.output)

  const poolInfosRes = await multicall({
    ctx,
    calls: range(0, poolsCount).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: abi.poolInfo,
  })

  for (let idx = 0; idx < poolsCount; idx++) {
    const poolInfoRes = poolInfosRes[idx]
    if (!isSuccess(poolInfoRes)) continue

    const { lptoken: address, gauge, token, crvRewards } = poolInfoRes.output
    pools.push({
      chain: ctx.chain,
      address,
      gauge,
      token,
      lpToken: address,
      crvRewards,
      rewards: [CRV, CVX],
    })
  }

  const poolsAddressesRes = await multicall({
    ctx,
    calls: pools.map(({ address }) => ({
      target: metaRegistry.address,
      params: [address],
    })),
    abi: abi.getPoolFromLPToken,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const poolAddressRes = poolsAddressesRes[poolIdx]
    if (!isSuccess(poolAddressRes)) continue

    pool.pool = poolAddressRes.output
  }

  const underlyingsRes = await multicall({
    ctx,
    calls: pools.map(({ pool }) => ({
      target: metaRegistry.address,
      params: [pool],
    })),
    abi: abi.getUnderlyingsCoins,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyingRes = underlyingsRes[poolIdx]
    if (!isSuccess(underlyingRes)) continue

    pool.underlyings = underlyingRes.output
      .map((address: string) => address.toLowerCase())
      // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
      .filter((address: string) => address !== ethers.constants.AddressZero)
      // replace ETH alias
      .map((address: string) => (address === ETH_ADDR ? ethers.constants.AddressZero : address))
  }

  return getExtraRewards(ctx, pools)
}

const getExtraRewards = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const commonRewardsPools: Contract[] = []
  const extraRewardsPools: Contract[] = []

  const extraRewardsLengthsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({
      target: pool.crvRewards,
      params: [],
    })),
    abi: abi.extraRewardsLength,
  })

  const extraRewardsRes = await multicall<string, [number], string>({
    ctx,
    calls: extraRewardsLengthsRes.filter(isSuccess).flatMap((res) =>
      range(0, res.output).map((idx) => ({
        target: res.input.target,
        params: [idx],
      })),
    ),
    abi: abi.extraRewards,
  })

  let extraRewardsCallIdx = 0
  for (let poolIdx = 0; poolIdx < extraRewardsLengthsRes.length; poolIdx++) {
    const extraRewardsLengthRes = extraRewardsLengthsRes[poolIdx]
    if (!isSuccess(extraRewardsLengthRes)) continue

    const baseRewardPool: Contract = { ...pools[poolIdx], rewarder: [] as string[] }

    for (let extraRewardIdx = 0; extraRewardIdx < extraRewardsLengthRes.output; extraRewardIdx++) {
      const extraRewardRes = extraRewardsRes[extraRewardsCallIdx]
      if (isSuccess(extraRewardRes)) {
        baseRewardPool.rewarder.push(extraRewardRes.output)
      }
      extraRewardsCallIdx++
    }

    if (isZero(baseRewardPool.rewarder.length)) {
      commonRewardsPools.push(baseRewardPool)
      continue
    }

    extraRewardsPools.push(baseRewardPool)
  }

  const extraRewardsTokensRes = await multicall({
    ctx,
    calls: extraRewardsPools.flatMap((pool) => pool.rewarder.map((res: any) => ({ target: res, params: [] }))),
    abi: abi.rewardToken,
  })

  let extraRewardsTokensIdx = 0
  for (let poolIdx = 0; poolIdx < extraRewardsPools.length; poolIdx++) {
    const pool = extraRewardsPools[poolIdx]

    for (let extraRewardIdx = 0; extraRewardIdx < pool.rewarder.length; extraRewardIdx++) {
      const extraRewardsTokens = extraRewardsTokensRes[extraRewardsTokensIdx]
      if (!isSuccess(extraRewardsTokens)) continue

      pool.rewards?.push(extraRewardsTokens.output)
      extraRewardsTokensIdx++
    }
  }

  return [...commonRewardsPools, ...extraRewardsPools]
}
