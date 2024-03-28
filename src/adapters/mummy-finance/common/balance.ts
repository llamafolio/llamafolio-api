import type { Balance, BalancesContext, BaseContract, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { ADDRESS_ZERO } from '@lib/contract'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  stakedAmounts: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'stakedAmounts',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimable: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimableReward: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'claimableReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getRedemptionCollateral: {
    inputs: [{ internalType: 'address', name: '_token', type: 'address' }],
    name: 'getRedemptionCollateral',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  depositBalances: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'depositBalances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const esMMY: { [key: string]: Contract } = {
  arbitrum: { chain: 'arbitrum', address: '0x68d1ca32aee9a73534429d8376743bf222ff1870', decimals: 18, symbol: 'esMMY' },
  base: { chain: 'base', address: '0x9032aed8c1f2139e04c1ad6d9f75bdf1d6e5cf5c', decimals: 18, symbol: 'esMMY' },
  fantom: { chain: 'fantom', address: '0xe41c6c006de9147fc4c84b20cdfbfc679667343f', decimals: 18, symbol: 'esMMY' },
  optimism: { chain: 'optimism', address: '0x0d8393cea30df4fafa7f00f333a62dee451935c1', decimals: 18, symbol: 'esMMY' },
}

const native: { [key: string]: Contract } = {
  arbitrum: { chain: 'arbitrum', address: ADDRESS_ZERO, decimals: 18, symbol: 'ETH' },
  base: { chain: 'base', address: ADDRESS_ZERO, decimals: 18, symbol: 'ETH' },
  fantom: { chain: 'fantom', address: ADDRESS_ZERO, decimals: 18, symbol: 'FTM' },
  optimism: { chain: 'optimism', address: ADDRESS_ZERO, decimals: 18, symbol: 'ETH' },
}

export async function getMMYStakeBalance(
  ctx: BalancesContext,
  mmy: Contract,
  vault: Contract,
): Promise<Balance | undefined> {
  const underlyings = mmy.underlyings as Contract[]
  if (!underlyings) return

  const [userShare, pendingNative, pendingEsMMY] = await Promise.all([
    call({ ctx, target: mmy.address, params: [ctx.address], abi: abi.stakedAmounts }),
    call({ ctx, target: mmy.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: mmy.address, params: [ctx.address], abi: abi.claimableReward }),
  ])

  // CARE: the logic on arbitrum and fantom seems different
  let rewards

  if (ctx.chain === 'arbitrum' || ctx.chain === 'fantom') {
    rewards = [{ ...esMMY[ctx.chain], amount: pendingNative }]
  } else {
    rewards = [
      { ...native[ctx.chain], amount: pendingNative },
      { ...esMMY[ctx.chain], amount: pendingEsMMY },
    ]
  }

  const stakeBalance: Balance = { ...mmy, amount: userShare, underlyings, rewards, category: 'stake' }
  return getUnderlyingsBalances(ctx, stakeBalance, vault)
}

export async function getUnderlyingsBalances(
  ctx: BalancesContext,
  glpBalance: Balance,
  vault: Contract,
): Promise<Balance | undefined> {
  const rawUnderlyings = glpBalance.underlyings as Contract[]
  if (!rawUnderlyings) return

  const [underlyingsRedemptions, totalSupply] = await Promise.all([
    multicall({
      ctx,
      calls: rawUnderlyings.map((underlying) => ({ target: vault.address, params: [underlying.address] }) as const),
      abi: abi.getRedemptionCollateral,
    }),
    call({ ctx, target: glpBalance.address, abi: erc20Abi.totalSupply }),
  ])

  const underlyings = mapSuccessFilter(underlyingsRedemptions, (res, index) => {
    const underlying = rawUnderlyings[index]
    return { ...underlying, amount: (res.output * glpBalance.amount) / totalSupply }
  })

  return { ...glpBalance, underlyings }
}

export async function getMMXStakerBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const [sbfMMY, mmy] = staker.underlyings as BaseContract[]

  const [stakeGMX, stakeEsGMX, pendingesGMXRewards, pendingETHRewards] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.stakedAmounts }),
    call({ ctx, target: staker.address, params: [ctx.address, esMMY[ctx.chain].address], abi: abi.depositBalances }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: sbfMMY.address, params: [ctx.address], abi: abi.claimable }),
  ])

  const rewards = [
    { ...esMMY[ctx.chain], amount: pendingesGMXRewards },
    { ...native[ctx.chain], amount: pendingETHRewards },
  ]

  return [
    {
      ...staker,
      amount: stakeGMX - stakeEsGMX,
      underlyings: [{ ...mmy, amount: stakeGMX - stakeEsGMX }],
      rewards,
      category: 'stake',
    },
    { ...esMMY[ctx.chain], category: 'stake', amount: stakeEsGMX, underlyings: undefined, rewards: undefined },
  ]
}
