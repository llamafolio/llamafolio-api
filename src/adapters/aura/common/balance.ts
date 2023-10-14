import { getExtraRewardsBalances } from '@adapters/aura/common/extraReward'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { getBalancesOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { resolveUnderlyingsBalances } from '@lib/underlying/resolver'
import { parseEther } from 'viem'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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

  return { ...staker, amount: balanceOfRes, underlyings: undefined, rewards: undefined, category: 'farm' }
}

export async function getAuraFarmBalances(
  ctx: BalancesContext,
  pools: Contract[],
  vault: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = (await getBalancesOf(ctx, pools, { getAddress: (contract) => contract.gauge })).map(
    (balance) => ({
      ...balance,
      category: 'farm',
    }),
  )

  const poolBalances = await resolveUnderlyingsBalances('balancer', {
    ctx,
    balances,
    vault,
    params: {
      getAddress: (balance: Balance) => balance.address,
      getCategory: (balance: Balance) => balance.category,
    },
  })

  const earnedsRes = await multicall({
    ctx,
    calls: poolBalances.map((balance: Contract) => ({ target: balance.gauge, params: [ctx.address] }) as const),
    abi: abi.earned,
  })

  const fmtBalances = mapSuccessFilter(earnedsRes, (res, idx) => {
    const poolBalance = poolBalances[idx]
    const rewards = poolBalance.rewards as Contract[]

    return { ...poolBalance, rewards: [{ ...rewards![0], amount: res.output }, ...rewards!.slice(1)] }
  }) as Balance[]

  return getAuraMintAmount(ctx, await getExtraRewardsBalances(ctx, fmtBalances))
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
