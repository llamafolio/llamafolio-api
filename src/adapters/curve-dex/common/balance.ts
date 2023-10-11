import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  get_underlying_decimals: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_decimals',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  reward_tokens: {
    stateMutability: 'view',
    type: 'function',
    name: 'reward_tokens',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3787,
  },
  claimable_reward: {
    stateMutability: 'nonpayable',
    type: 'function',
    name: 'claimable_tokens',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3038676,
  },
  claimable_extra_reward: {
    stateMutability: 'view',
    type: 'function',
    name: 'claimable_reward',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_reward_token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 20255,
  },
  reward_contract: {
    name: 'reward_contract',
    outputs: [{ type: 'address', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 2411,
  },
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  get_decimals: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_decimals',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
    gas: 9818,
  },
  get_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[4]' }],
    gas: 20435,
  },
} as const

type PoolBalance = Balance & {
  pool?: string
  token?: string
  totalSupply?: bigint
  registry?: `0x${string}`
  registryId?: string
  stablePool?: Contract
}

const stableRegistry: { [key: string]: `0x${string}` } = {
  arbitrum: '0x445FE580eF8d70FF569aB36e80c647af338db351',
  avalanche: '0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6',
  fantom: '0x0f854EA9F38ceA4B1c2FC79047E9D0134419D5d6',
  optimism: '0xC5cfaDA84E902aD92DD40194f0883ad49639b023',
  polygon: '0x094d12e5b541784701FD8d65F11fc0598FBC6332',
}

const blacklist = [
  { chain: 'avalanche', registryId: 'stableSwap' },
  { chain: 'fantom', registryId: 'stableSwap' },
  { chain: 'polygon', registryId: 'stableSwap' },
  { chain: 'ethereum', address: '0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8' },
  { chain: 'ethereum', address: '0x3b3ac5386837dc563660fb6a0937dfaa5924333b' },
  { chain: 'ethereum', address: '0x05ca5c01629a8e5845f12ea3a03ff7331932233a' },
  { chain: 'ethereum', address: '0xf5194c3325202f456c95c1cf0ca36f8475c1949f' },
  { chain: 'ethereum', address: '0x64E3C23bfc40722d3B649844055F1D51c1ac041d' },
]

function isInBlacklist(item: any) {
  return blacklist.some((blacklistedItem) =>
    Object.entries(blacklistedItem).every(([key, value]) => item[key] === value),
  )
}

export async function getPoolsBalances(ctx: BalancesContext, pools: Contract[], registry?: Contract) {
  const poolsBalancesOfRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const poolBalances: Balance[] = mapSuccessFilter(poolsBalancesOfRes, (res, idx) => {
    const pool = pools[idx]
    const { underlyings } = pool

    if (!underlyings || res.output === 0n) {
      return null
    }

    return {
      ...pool,
      amount: res.output,
    }
  }).filter(isNotNullish) as Balance[]

  if (poolBalances.length > 0) {
    return getUnderlyingsPoolsBalances(ctx, poolBalances, registry)
  }
}

export const getUnderlyingsPoolsBalances = async (
  ctx: BalancesContext,
  pools: PoolBalance[],
  registry?: Contract,
): Promise<Balance[]> => {
  const underlyingsBalancesInPools: Balance[] = []

  const suppliesCalls: Call<typeof erc20Abi.totalSupply>[] = []
  const calls: Call<typeof abi.get_underlying_balances>[] = []

  for (const pool of pools as Contract[]) {
    calls.push({ target: registry ? registry.address : pool.registry, params: [pool.pool] })
    suppliesCalls.push({ target: pool.token })
  }

  const [totalSuppliesRes, get_underlying_balancesOfRes, get_balancesOfRes] = await Promise.all([
    multicall({ ctx, calls: suppliesCalls, abi: erc20Abi.totalSupply }),
    multicall({ ctx, calls, abi: abi.get_underlying_balances }),
    multicall({ ctx, calls, abi: abi.get_balances }),
  ])

  let balanceOfIdx = 0
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const underlyings = pools[poolIdx].underlyings
    if (!underlyings) {
      continue
    }

    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!totalSupplyRes.success || totalSupplyRes.output === 0n) {
      // next pool
      balanceOfIdx += underlyings.length
      continue
    }

    const totalSupply = totalSupplyRes.output

    const poolBalance: PoolBalance = {
      ...pools[poolIdx],
      registry: pools[poolIdx].registry,
      registryId: pools[poolIdx].registryId,
      category: 'lp',
      underlyings: [],
      decimals: 18,
      totalSupply,
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlyingBalanceOfRes =
        get_underlying_balancesOfRes[balanceOfIdx] && get_underlying_balancesOfRes[balanceOfIdx].success
          ? get_underlying_balancesOfRes[balanceOfIdx]
          : get_balancesOfRes[balanceOfIdx]

      const underlyingsBalance =
        underlyingBalanceOfRes && underlyingBalanceOfRes.output?.filter(isNotNullish) != undefined
          ? underlyingBalanceOfRes.output[underlyingIdx]
          : 0n

      poolBalance.underlyings?.push({
        ...underlyings[underlyingIdx],
        // on Avalanche & Fantom & Polygon, stablePool uses fixed decimals as 18 even if tokens are USDC or USDT
        decimals:
          isInBlacklist({ chain: ctx.chain, registryId: poolBalance.registryId }) ||
          isInBlacklist({ chain: ctx.chain, address: poolBalance.address })
            ? 18
            : underlyings[underlyingIdx].decimals,
        amount: (underlyingsBalance * poolBalance.amount) / totalSupply,
      })
    }

    // Logic to unwrap and format amount of underlyings of the  metapools used as underlyings in the Curve's variable pools
    if (poolBalance.stablePool) {
      const stableUnderlyings = poolBalance.stablePool?.underlyings
      if (!stableUnderlyings) {
        continue
      }

      const [stablePoolSupply, get_underlying_balancesBalanceOfRes] = await Promise.all([
        call({
          ctx,
          target: poolBalance.stablePool.address,
          abi: erc20Abi.totalSupply,
        }),
        call({
          ctx,
          target: stableRegistry[ctx.chain],
          params: [poolBalance.stablePool.pool],
          abi: abi.get_underlying_balances,
        }),
      ])

      const fmtStableUnderlyings = stableUnderlyings.map((underlying: any, idx) => {
        return {
          ...underlying,
          decimals: 18,
          amount:
            ((poolBalance.underlyings![0] as Balance).amount * get_underlying_balancesBalanceOfRes[idx]) /
            stablePoolSupply,
        }
      })
      poolBalance.underlyings = [...fmtStableUnderlyings, ...poolBalance.underlyings!.slice(1)]
    }
    underlyingsBalancesInPools.push(poolBalance)
    balanceOfIdx++
  }

  return underlyingsBalancesInPools
}

export async function getGaugesBalances(ctx: BalancesContext, gauges: Contract[], registry?: Contract) {
  const uniqueRewards: Balance[] = []
  const nonUniqueRewards: Balance[] = []

  const [gaugesBalancesRes, claimableRewards] = await Promise.all([
    getPoolsBalances(ctx, gauges, registry),
    multicall({
      ctx,
      calls: gauges.map((gauge) => ({ target: gauge.address, params: [ctx.address] }) as const),
      abi: abi.claimable_reward,
    }),
  ])

  if (!gaugesBalancesRes) {
    return
  }

  const extraRewardsCalls: Call<typeof abi.claimable_extra_reward>[] = []
  for (let gaugeIdx = 0; gaugeIdx < gaugesBalancesRes.length; gaugeIdx++) {
    const gaugeBalance = gaugesBalancesRes[gaugeIdx]
    const rewards = gaugeBalance.rewards as Contract[]
    const claimableReward = claimableRewards[gaugeIdx]

    if (!rewards || !claimableReward.success) {
      continue
    }

    // rewards[0] is the common reward for all pools: CRV
    rewards[0].amount = claimableReward.output

    if (rewards.length != 2) {
      uniqueRewards.push({ ...gaugeBalance, category: 'farm' })
      continue
    }

    for (let rewardIdx = 1; rewardIdx < rewards.length; rewardIdx++) {
      const reward = rewards[rewardIdx]
      extraRewardsCalls.push({ target: (gaugeBalance as Contract).gauge, params: [ctx.address, reward.address] })
      nonUniqueRewards.push({ ...gaugeBalance, category: 'farm' })
    }
  }

  const extraRewardsRes = await multicall({ ctx, calls: extraRewardsCalls, abi: abi.claimable_extra_reward })

  for (let idx = 0; idx < nonUniqueRewards.length; idx++) {
    const rewards = nonUniqueRewards[idx].rewards
    const extraRewardRes = extraRewardsRes[idx]

    if (!rewards || !extraRewardRes.success) {
      continue
    }

    rewards[1].amount = extraRewardRes.output
  }

  return [...uniqueRewards, ...nonUniqueRewards]
}
