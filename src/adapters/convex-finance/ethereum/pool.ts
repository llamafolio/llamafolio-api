import { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Call, multicall } from '@lib/multicall'
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

export async function getPoolsContracts(ctx: BaseContext, contract: Contract) {
  const pools: Contract[] = []

  const calls: Call[] = []
  const callsPools: Call[] = []
  const callsRewarder: Call[] = []
  const callsUnderlyings: Call[] = []
  const callsExtraRewards: Call[] = []

  const poolsCountRes = await call({
    ctx,
    target: contract.address,
    params: [],
    abi: abi.poolLength,
  })

  const poolsCount = parseInt(poolsCountRes.output)

  for (let poolIdx = 0; poolIdx < poolsCount; poolIdx++) {
    calls.push({ target: contract.address, params: [poolIdx] })
  }

  const poolInfosRes = await multicall({ ctx, calls, abi: abi.poolInfo })

  for (let idx = 0; idx < poolsCount; idx++) {
    const poolInfoRes = poolInfosRes[idx]

    if (!isSuccess(poolInfoRes) /* || poolInfoRes.output.lptoken === '0xB15fFb543211b558D40160811e5DcBcd7d5aaac9' */) {
      continue
    }

    pools.push({
      chain: ctx.chain,
      address: poolInfoRes.output.lptoken,
      gauge: poolInfoRes.output.gauge,
      token: poolInfoRes.output.token,
      lpToken: poolInfoRes.output.lptoken,
      crvRewards: poolInfoRes.output.crvRewards,
      rewards: [CRV, CVX],
    })

    callsPools.push({ target: metaRegistry.address, params: [poolInfoRes.output.lptoken] })
    callsRewarder.push({ target: poolInfoRes.output.crvRewards, params: [0] })
  }

  const [poolsAddressesRes, rewarderAddressesRes] = await Promise.all([
    multicall({ ctx, calls: callsPools, abi: abi.getPoolFromLPToken }),
    multicall({ ctx, calls: callsRewarder, abi: abi.extraRewards }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const poolAddressRes = poolsAddressesRes[poolIdx]
    const rewarderAddressRes = rewarderAddressesRes[poolIdx]

    if (!isSuccess(poolAddressRes)) {
      continue
    }

    pool.pool = poolAddressRes.output
    pool.rewarder = rewarderAddressRes.output || undefined

    callsUnderlyings.push({ target: metaRegistry.address, params: [poolAddressRes.output] })
    callsExtraRewards.push({ target: rewarderAddressRes.output && rewarderAddressRes.output, params: [] })
  }

  const [underlyingsRes, extraRewardsRes] = await Promise.all([
    multicall({ ctx, calls: callsUnderlyings, abi: abi.getUnderlyingsCoins }),
    multicall({ ctx, calls: callsExtraRewards, abi: abi.rewardToken }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyingRes = underlyingsRes[poolIdx]
    const extraRewardRes = extraRewardsRes[poolIdx]

    if (!isSuccess(underlyingRes)) {
      continue
    }

    pool.underlyings = underlyingRes.output
      .map((address: string) => address.toLowerCase())
      // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
      .filter((address: string) => address !== ethers.constants.AddressZero)
      // replace ETH alias
      .map((address: string) => (address === ETH_ADDR ? ethers.constants.AddressZero : address))

    if (!isSuccess(extraRewardRes)) {
      continue
    }

    pool.rewards?.push(extraRewardRes.output)
  }
  return pools
}

// export async function getBaseRewardPoolsRewards(ctx: BaseContext, baseRewardPools: BaseRewardPoolContract[]) {
//   const res: BaseRewardPoolContract[] = []

//   const extraRewardsLengthsRes = await multicall({
//     ctx,
//     calls: baseRewardPools.map((baseRewardPool) => ({
//       target: baseRewardPool.crvRewards,
//       params: [],
//     })),
//     abi: abi.extraRewardsLength,
//   })

//   const extraRewardsRes = await multicall<string, [number], string>({
//     ctx,
//     calls: extraRewardsLengthsRes.filter(isSuccess).flatMap((res) =>
//       range(0, res.output).map((idx) => ({
//         target: res.input.target,
//         params: [idx],
//       })),
//     ),
//     abi: abi.extraRewards,
//   })

//   let extraRewardCallIdx = 0
//   for (let poolIdx = 0; poolIdx < extraRewardsLengthsRes.length; poolIdx++) {
//     const extraRewardsLengthRes = extraRewardsLengthsRes[poolIdx]
//     if (!isSuccess(extraRewardsLengthRes)) {
//       continue
//     }

//     const baseRewardPool = { ...baseRewardPools[poolIdx], rewards: [] as string[] }

//     for (let extraRewardIdx = 0; extraRewardIdx < extraRewardsLengthRes.output; extraRewardIdx++) {
//       const extraRewardRes = extraRewardsRes[extraRewardCallIdx]
//       if (isSuccess(extraRewardRes)) {
//         baseRewardPool.rewards.push(extraRewardRes.output)
//       }

//       extraRewardCallIdx++
//     }

//     res.push(baseRewardPool)
//   }

//   return res
// }

// export async function getPoolsBalances(ctx: BalancesContext, pools: PoolContract[], CVX: Token, CRV: Token) {

//   const balances = await getCurvePoolsBalances(ctx, pools, {
//     getBalanceAddress: (pool) => pool.crvRewards,
//     getLpTokenAddress: (pool) => pool.lpToken,
//     getPoolAddress: (pool) => pool.pool,
//   })

//   const [crvEarnedRes, extraRewardsEarnedRes, cvxTotalSupplyRes] = await Promise.all([
//     multicall({
//       ctx,
//       calls: balances.map((balance) => ({
//         // @ts-ignore
//         target: balance.crvRewards,
//         params: [ctx.address],
//       })),
//       abi: abi.earned,
//     }),

//     multicall({
//       ctx,
//       calls: balances.flatMap((balance) =>
//         (balance.rewards || []).map((reward) => ({
//           target: reward.address,
//           params: [ctx.address],
//         })),
//       ),
//       abi: abi.earned,
//     }),

//     call({
//       ctx,
//       target: CVX.address,
//       abi: erc20Abi.totalSupply,
//       params: [],
//     }),
//   ])

//   let extraRewardsEarnedIdx = 0
//   for (let balanceIdx = 0; balanceIdx < balances.length; balanceIdx++) {
//     const balance = balances[balanceIdx]
//     balance.category = 'stake'

//     const crvEarned = BigNumber.from(crvEarnedRes[balanceIdx].output || '0')
//     const cvxTotalSupply = BigNumber.from(cvxTotalSupplyRes.output || '0')

//     const rewards: Balance[] = []

//     if (crvEarned.gt(0)) {
//       const cvxEarned = getCvxCliffRatio(cvxTotalSupply, crvEarned)
//       rewards.push({ ...CRV, amount: crvEarned }, { ...CVX, amount: cvxEarned })
//     }

//     if (balance.rewards) {
//       for (let extraRewardIdx = 0; extraRewardIdx < balance.rewards.length; extraRewardIdx++) {
//         const extraRewardEarnedRes = extraRewardsEarnedRes[extraRewardsEarnedIdx]

//         rewards.push({
//           ...balance.rewards?.[extraRewardIdx],
//           amount: BigNumber.from(extraRewardEarnedRes.output || '0'),
//         })

//         extraRewardsEarnedIdx++
//       }
//     }

//     balance.rewards = rewards
//   }

//   return balances
// }
