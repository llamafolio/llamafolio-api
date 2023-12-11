import type { Balance, BalancesContext, BaseContract, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
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
  claimable: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolAmounts: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'poolAmounts',
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
} as const

type GLPBalance = Balance & {
  sfGlp: `0x${string}`
}

export async function getGMXStakerBalances(ctx: BalancesContext, gmxStaker: Contract): Promise<Balance[]> {
  const [sbfGMX, gmx] = gmxStaker.underlyings as BaseContract[]
  const [esGMX, native] = gmxStaker.rewards as BaseContract[]

  const [stakeGMX, stakeEsGMX, pendingesGMXRewards, pendingETHRewards] = await Promise.all([
    call({ ctx, target: gmxStaker.address, params: [ctx.address, gmx.address], abi: abi.depositBalances }),
    call({ ctx, target: gmxStaker.address, params: [ctx.address, esGMX.address], abi: abi.depositBalances }),
    call({ ctx, target: gmxStaker.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: sbfGMX.address, params: [ctx.address], abi: abi.claimable }),
  ])

  const rewards = [
    { ...esGMX, amount: pendingesGMXRewards },
    { ...native, amount: pendingETHRewards },
  ]

  return [
    { ...gmxStaker, amount: stakeGMX, underlyings: [{ ...gmx, amount: stakeGMX }], rewards, category: 'stake' },
    { ...esGMX, category: 'stake', amount: stakeEsGMX },
  ]
}

export async function getGMXVesterBalance(ctx: BalancesContext, gmxVester: Contract): Promise<Balance | undefined> {
  const gmx = gmxVester.underlyings?.[0] as BaseContract
  if (!gmx) return

  const [balanceOf, claimable] = await Promise.all([
    call({ ctx, target: gmxVester.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: gmxVester.address, params: [ctx.address], abi: abi.claimable }),
  ])

  return {
    ...gmxVester,
    amount: balanceOf,
    underlyings: [{ ...gmx, amount: balanceOf }],
    rewards: [{ ...gmx, amount: claimable }],
    category: 'vest',
  }
}

export async function getGLPStakerBalance(
  ctx: BalancesContext,
  glpStaker: Contract,
  vault: Contract,
): Promise<Balance | undefined> {
  if (!glpStaker.underlyings || !glpStaker.rewards) return
  const [esGMX, native] = glpStaker.rewards as BaseContract[]

  const [stakeGLP, pendingesGMXRewards, pendingETHRewards] = await Promise.all([
    call({ ctx, target: glpStaker.sfGlp, params: [ctx.address], abi: abi.stakedAmounts }),
    call({ ctx, target: glpStaker.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: glpStaker.sfGlp, params: [ctx.address], abi: abi.claimable }),
  ])

  const balance: GLPBalance = {
    ...glpStaker,
    chain: ctx.chain,
    category: 'stake',
    amount: stakeGLP,
    sfGlp: glpStaker.sfGlp,
    underlyings: glpStaker.underlyings as Contract[],
    rewards: [
      { ...esGMX, amount: pendingesGMXRewards },
      { ...native, amount: pendingETHRewards },
    ],
  }

  return getGLPUnderlyingsBalances(ctx, balance, vault)
}

export async function getGLPVesterBalance(ctx: BalancesContext, glpVester: Contract): Promise<Balance> {
  const [balanceOf, claimable] = await Promise.all([
    call({ ctx, target: glpVester.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: glpVester.address, params: [ctx.address], abi: abi.claimable }),
  ])

  const underlyings = glpVester.underlyings?.[0]
    ? [{ ...(glpVester.underlyings[0] as BaseContract), amount: balanceOf }]
    : undefined

  const rewards = glpVester.rewards?.[0]
    ? [{ ...(glpVester.rewards[0] as BaseContract), amount: claimable }]
    : undefined

  return {
    ...glpVester,
    amount: balanceOf,
    underlyings,
    rewards,
    category: 'vest',
  }
}

export async function getGLPUnderlyingsBalances(
  ctx: BalancesContext,
  glpBalance: GLPBalance,
  vault: Contract,
): Promise<Balance | undefined> {
  const rawUnderlyings = glpBalance.underlyings as Contract[]
  if (!rawUnderlyings) return

  const [underlyingsRedemptions, underlyingsInPoolAmounts, totalSupply] = await Promise.all([
    multicall({
      ctx,
      calls: rawUnderlyings.map((underlying) => ({ target: vault.address, params: [underlying.address] }) as const),
      abi: abi.getRedemptionCollateral,
    }),
    multicall({
      ctx,
      calls: rawUnderlyings.map((underlying) => ({ target: vault.address, params: [underlying.address] }) as const),
      abi: abi.poolAmounts,
    }),
    call({ ctx, target: glpBalance.sfGlp, abi: erc20Abi.totalSupply }),
  ])

  const underlyings = mapMultiSuccessFilter(
    underlyingsRedemptions.map((_, i) => [underlyingsRedemptions[i], underlyingsInPoolAmounts[i]]),

    (res, index) => {
      const underlying = rawUnderlyings[index]
      const [{ output: balanceUsed }, { output: underlyinAmount }] = res.inputOutputPairs

      return {
        ...underlying,
        amount:
          (BigInt((Number(balanceUsed) / Number(underlyinAmount)) * Number(underlyinAmount)) * glpBalance.amount) /
          totalSupply,
      }
    },
  )

  return { ...glpBalance, underlyings }
}
