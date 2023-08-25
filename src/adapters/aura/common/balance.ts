import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  extraEarned: {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'earned',
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
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  reductionPerCliff: {
    inputs: [],
    name: 'reductionPerCliff',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  EMISSIONS_MAX_SUPPLY: {
    inputs: [],
    name: 'EMISSIONS_MAX_SUPPLY',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalCliffs: {
    inputs: [],
    name: 'totalCliffs',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  mintRate: {
    inputs: [],
    name: 'mintRate',
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
  balanceOfUnderlying: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'balanceOfUnderlying',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const AURA: { [key: string]: `0x${string}`[] } = {
  optimism: ['0x1509706a6c66CA549ff0cB464de88231DDBe213B', '0xec1c780a275438916e7ceb174d80878f29580606'],
  arbitrum: ['0x1509706a6c66CA549ff0cB464de88231DDBe213B', '0xeC1c780A275438916E7CEb174D80878f29580606'],
  polygon: ['0x1509706a6c66CA549ff0cB464de88231DDBe213B', '0x8b2970c237656d3895588B99a8bFe977D5618201'],
  gnosis: ['0x1509706a6c66CA549ff0cB464de88231DDBe213B', '0x8b2970c237656d3895588B99a8bFe977D5618201'],
}

export async function getAuraBalStakerBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const balanceOfRes = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.balanceOfUnderlying })

  return {
    ...staker,
    amount: balanceOfRes,
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }
}

export async function getAuraFarmBalances(
  ctx: BalancesContext,
  pools: Contract[],
  vault: Contract,
): Promise<Balance[]> {
  const balanceWithStandardRewards: Balance[] = []
  const balanceWithExtraRewards: Balance[] = []
  const balances = await getAuraBalancesInternal(ctx, pools, vault, 'gauge')

  const earnedsRes = await multicall({
    ctx,
    calls: balances.map((balance: Contract) => ({ target: balance.gauge, params: [ctx.address] }) as const),
    abi: abi.earned,
  })

  mapSuccessFilter(earnedsRes, (res, idx) => {
    const balance = balances[idx]
    const rewards = balance.rewards

    const poolBalance: Balance = {
      ...balance,
      rewards: [{ ...rewards![0], amount: res.output }, ...rewards!.slice(1)],
    }

    if (poolBalance.rewards && poolBalance.rewards.length > 1) {
      balanceWithExtraRewards.push(poolBalance)
    } else {
      balanceWithStandardRewards.push(poolBalance)
    }
  })

  const balanceWithExtraRewardsBalances = await getExtraRewardsBalances(ctx, balanceWithExtraRewards)

  return getAuraMintAmount(ctx, [...balanceWithStandardRewards, ...balanceWithExtraRewardsBalances])
}

export async function getAuraBalancesInternal(
  ctx: BalancesContext,
  inputPools: Contract[],
  vault: Contract,
  targetProp: 'address' | 'gauge',
): Promise<Balance[]> {
  const balances: Balance[] = []

  const fmtPools: Contract[] = []
  inputPools.forEach((pool) => {
    if (targetProp === 'gauge' && Array.isArray(pool.gauge)) {
      pool.gauge.forEach((gauge) => {
        fmtPools.push({ ...pool, gauge: gauge })
      })
    } else {
      fmtPools.push(pool)
    }
  })

  const [poolBalancesRes, uBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: fmtPools.map((pool) => ({ target: pool[targetProp], params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: fmtPools.map((pool) => ({ target: vault.address, params: [pool.poolId] }) as const),
      abi: abi.getPoolTokens,
    }),
    multicall({
      ctx,
      calls: fmtPools.map((pool) => ({ target: pool.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (const [index, pool] of fmtPools.entries()) {
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Balance[]
    const poolBalanceRes = poolBalancesRes[index]
    const uBalanceRes = uBalancesRes[index]
    const totalSupplyRes = totalSuppliesRes[index]

    if (
      !underlyings ||
      !poolBalanceRes.success ||
      !uBalanceRes.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const [_tokens, underlyingsBalances] = uBalanceRes.output

    underlyings.forEach((underlying, idx) => {
      const amount = underlyingsBalances[idx]
      underlying.amount = amount
    })

    const lpTokenBalance = underlyings.find(
      (underlying) => underlying.address.toLowerCase() === pool.address.toLowerCase(),
    )

    const fmtUnderlyings = underlyings
      .map((underlying) => {
        const realSupply = lpTokenBalance ? totalSupplyRes.output - lpTokenBalance.amount : totalSupplyRes.output
        const amount = (underlying.amount * poolBalanceRes.output) / realSupply

        return {
          ...underlying,
          amount,
        }
      })
      .filter((underlying) => underlying.address.toLowerCase() !== pool.address.toLowerCase())

    balances.push({ ...pool, amount: poolBalanceRes.output, underlyings: fmtUnderlyings, rewards, category: 'farm' })
  }

  return balances
}

const getExtraRewardsBalances = async (ctx: BalancesContext, poolBalance: Balance[]): Promise<Balance[]> => {
  const extraRewardsBalancesRes = await multicall({
    ctx,
    calls: poolBalance.map((pool: Contract) => ({ target: pool.rewarder, params: [ctx.address] }) as const),
    abi: abi.extraEarned,
  })

  poolBalance.forEach((pool, idx) => {
    const extraRewardsBalances = extraRewardsBalancesRes[idx].success ? extraRewardsBalancesRes[idx].output : 0n
    pool.rewards = [pool.rewards![0], { ...pool.rewards![1], amount: extraRewardsBalances! }]
  })

  return poolBalance
}

const getAuraMintAmount = async (ctx: BalancesContext, balances: Balance[]): Promise<Balance[]> => {
  const mintRate = await call({ ctx, target: AURA[ctx.chain][1], abi: abi.mintRate })

  return balances.map((balance) => ({
    ...balance,
    rewards: [
      ...balance.rewards!,
      {
        chain: ctx.chain,
        address: AURA[ctx.chain][0],
        decimals: 18,
        symbol: 'AURA',
        amount: (balance.rewards![0].amount * mintRate) / parseEther('1.0'),
      },
    ],
  }))
}
