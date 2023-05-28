import type { Balance, BalancesContext, BaseContract, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { getPoolsUnderlyingBalances } from '@lib/pools'

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
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'depositBalances',
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
  claimable: {
    inputs: [
      {
        internalType: 'address',
        name: '_account',
        type: 'address',
      },
    ],
    name: 'claimable',
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
} as const

export async function getGMXStakerBalances(ctx: BalancesContext, gmxStaker: Contract) {
  if (!gmxStaker.underlyings || !gmxStaker.rewards) {
    return []
  }

  const balances: Balance[] = []
  const sbfGMX = gmxStaker.underlyings?.[0] as BaseContract
  const gmx = gmxStaker.underlyings?.[1] as BaseContract
  const esGMX = gmxStaker.rewards?.[0] as BaseContract
  const native = gmxStaker.rewards?.[1] as BaseContract

  const [stakeGMX, stakeEsGMX, pendingesGMXRewards, pendingETHRewards] = await Promise.all([
    call({ ctx, target: gmxStaker.address, params: [ctx.address, gmx.address], abi: abi.depositBalances }),
    call({ ctx, target: gmxStaker.address, params: [ctx.address, esGMX.address], abi: abi.depositBalances }),
    call({ ctx, target: gmxStaker.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: sbfGMX.address, params: [ctx.address], abi: abi.claimable }),
  ])

  balances.push(
    {
      chain: ctx.chain,
      category: 'stake',
      address: gmxStaker.address,
      symbol: gmxStaker.symbol,
      decimals: gmxStaker.decimals,
      amount: stakeGMX,
      underlyings: [{ ...gmx, amount: stakeGMX }],
      rewards: [
        { ...esGMX, amount: pendingesGMXRewards },
        { ...native, amount: pendingETHRewards },
      ],
    },
    {
      chain: ctx.chain,
      category: 'stake',
      address: esGMX.address,
      symbol: esGMX.symbol,
      decimals: esGMX.decimals,
      amount: stakeEsGMX,
    },
  )

  return balances
}

export async function getGMXVesterBalance(ctx: BalancesContext, gmxVester: Contract) {
  const gmx = gmxVester.underlyings?.[0] as BaseContract
  if (!gmx) {
    return []
  }

  const [balanceOf, claimable] = await Promise.all([
    call({ ctx, target: gmxVester.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: gmxVester.address, params: [ctx.address], abi: abi.claimable }),
  ])

  const balance: Balance = {
    chain: ctx.chain,
    category: 'vest',
    address: gmxVester.address,
    symbol: gmxVester.symbol,
    decimals: gmxVester.decimals,
    amount: balanceOf,
    underlyings: [{ ...gmx, amount: balanceOf }],
    rewards: [{ ...gmx, amount: claimable }],
  }

  return balance
}

export async function getGLPStakerBalance(ctx: BalancesContext, glpStaker: Contract, vault: Contract) {
  if (!glpStaker.underlyings || !glpStaker.rewards) {
    return []
  }

  const esGMX = glpStaker.rewards?.[0] as BaseContract
  const native = glpStaker.rewards?.[1] as BaseContract

  const [stakeGLP, pendingesGMXRewards, pendingETHRewards] = await Promise.all([
    call({ ctx, target: glpStaker.address, params: [ctx.address], abi: abi.stakedAmounts }),
    call({ ctx, target: glpStaker.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: glpStaker.fGlp, params: [ctx.address], abi: abi.claimable }),
  ])

  const balance: Balance = {
    ...glpStaker,
    chain: ctx.chain,
    category: 'stake',
    address: glpStaker.address,
    symbol: glpStaker.symbol,
    decimals: glpStaker.decimals,
    amount: stakeGLP,
    rewards: [
      { ...esGMX, amount: pendingesGMXRewards },
      { ...native, amount: pendingETHRewards },
    ],
  }

  const [{ underlyings }] = await getPoolsUnderlyingBalances(ctx, [{ ...balance }], {
    getPoolAddress: () => vault.address,
  })

  balance.underlyings = underlyings

  return balance
}

export async function getGLPVesterBalance(ctx: BalancesContext, glpVester: Contract) {
  const [balanceOf, claimable] = await Promise.all([
    call({ ctx, target: glpVester.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: glpVester.address, params: [ctx.address], abi: abi.claimable }),
  ])

  const balance: Balance = {
    chain: ctx.chain,
    category: 'vest',
    address: glpVester.address,
    symbol: glpVester.symbol,
    decimals: glpVester.decimals,
    amount: balanceOf,
  }

  if (glpVester.underlyings?.[0]) {
    balance.underlyings = [{ ...(glpVester.underlyings[0] as BaseContract), amount: balanceOf }]
  }

  if (glpVester.rewards?.[0]) {
    balance.rewards = [{ ...(glpVester.rewards[0] as BaseContract), amount: claimable }]
  }

  return balance
}
