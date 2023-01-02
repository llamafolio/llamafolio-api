import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { BigNumber } from 'ethers'

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
}

export async function getGMXStakerBalances(ctx: BalancesContext, gmxStaker: Contract) {
  if (!gmxStaker.underlyings || !gmxStaker.rewards) {
    return []
  }

  const balances: Balance[] = []
  const sbfGMX = gmxStaker.underlyings?.[0]
  const gmx = gmxStaker.underlyings?.[1]
  const esGMX = gmxStaker.rewards?.[0]
  const native = gmxStaker.rewards?.[1]

  const [stakeGMXRes, stakeEsGMXRes, pendingesGMXRewardsRes, pendingETHRewardsRes] = await Promise.all([
    call({ ctx, target: gmxStaker.address, params: [ctx.address, gmx.address], abi: abi.depositBalances }),
    call({ ctx, target: gmxStaker.address, params: [ctx.address, esGMX.address], abi: abi.depositBalances }),
    call({ ctx, target: gmxStaker.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: sbfGMX.address, params: [ctx.address], abi: abi.claimable }),
  ])

  const stakeGMX = BigNumber.from(stakeGMXRes.output)
  const stakeEsGMX = BigNumber.from(stakeEsGMXRes.output)
  const pendingesGMXRewards = BigNumber.from(pendingesGMXRewardsRes.output)
  const pendingETHRewards = BigNumber.from(pendingETHRewardsRes.output)

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
  const gmx = gmxVester.underlyings?.[0]
  if (!gmx) {
    return []
  }

  const [balanceOfRes, claimableRes] = await Promise.all([
    call({ ctx, target: gmxVester.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: gmxVester.address, params: [ctx.address], abi: abi.claimable }),
  ])

  const balanceOf = BigNumber.from(balanceOfRes.output)
  const claimable = BigNumber.from(claimableRes.output)

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

export async function getGLPStakerBalance(ctx: BalancesContext, glpStaker: Contract) {
  if (!glpStaker.underlyings || !glpStaker.rewards) {
    return []
  }

  const glp = glpStaker.underlyings?.[0]
  const esGMX = glpStaker.rewards?.[0]
  const native = glpStaker.rewards?.[1]

  const [stakeGLPRes, pendingesGMXRewardsRes, pendingETHRewardsRes] = await Promise.all([
    call({ ctx, target: glpStaker.address, params: [ctx.address], abi: abi.stakedAmounts }),
    call({ ctx, target: glpStaker.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: glpStaker.fGlp, params: [ctx.address], abi: abi.claimable }),
  ])

  const stakeGLP = BigNumber.from(stakeGLPRes.output)
  const pendingesGMXRewards = BigNumber.from(pendingesGMXRewardsRes.output)
  const pendingETHRewards = BigNumber.from(pendingETHRewardsRes.output)

  const balance: Balance = {
    chain: ctx.chain,
    category: 'stake',
    address: glpStaker.address,
    symbol: glpStaker.symbol,
    decimals: glpStaker.decimals,
    amount: stakeGLP,
    underlyings: [{ ...glp, amount: stakeGLP }],
    rewards: [
      { ...esGMX, amount: pendingesGMXRewards },
      { ...native, amount: pendingETHRewards },
    ],
  }

  return balance
}

export async function getGLPVesterBalance(ctx: BalancesContext, glpVester: Contract) {
  const [balanceOfRes, claimableRes] = await Promise.all([
    call({ ctx, target: glpVester.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: glpVester.address, params: [ctx.address], abi: abi.claimable }),
  ])

  const balanceOf = BigNumber.from(balanceOfRes.output)
  const claimable = BigNumber.from(claimableRes.output)

  const balance: Balance = {
    chain: ctx.chain,
    category: 'vest',
    address: glpVester.address,
    symbol: glpVester.symbol,
    decimals: glpVester.decimals,
    amount: balanceOf,
  }

  if (glpVester.underlyings?.[0]) {
    balance.underlyings = [{ ...glpVester.underlyings[0], amount: balanceOf }]
  }

  if (glpVester.rewards?.[0]) {
    balance.rewards = [{ ...glpVester.rewards[0], amount: claimable }]
  }

  return balance
}
