import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { parseEther } from 'viem'

const abi = {
  exchangeRate: {
    inputs: [],
    name: 'exchangeRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserBalanceForPool: {
    inputs: [
      { internalType: 'address', name: 'conicPool', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getUserBalanceForPool',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimableRewards: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'claimableRewards',
    outputs: [
      { internalType: 'uint256', name: 'cncRewards', type: 'uint256' },
      { internalType: 'uint256', name: 'crvRewards', type: 'uint256' },
      { internalType: 'uint256', name: 'cvxRewards', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  lockedBalance: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'lockedBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  voteLocks: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'voteLocks',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  balances: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimableReward: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'claimableRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
} as const

const CNC: Token = {
  chain: 'ethereum',
  address: '0x9aE380F0272E2162340a5bB646c354271c0F5cFC',
  decimals: 18,
  symbol: 'CNC',
}

const metaRegistry: Contract = {
  name: 'Curve Metaregistry',
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getConicBalances(
  ctx: BalancesContext,
  contracts: Contract[],
  staker: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balancesOfRes, claimableRewardsRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map(
        (contract) => ({ target: staker.address, params: [contract.address, ctx.address] }) as const,
      ),
      abi: abi.getUserBalanceForPool,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.rewarder, params: [ctx.address] }) as const),
      abi: abi.claimableRewards,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address })),
      abi: abi.exchangeRate,
    }),
  ])

  for (let poolIdx = 0; poolIdx < contracts.length; poolIdx++) {
    const contract = contracts[poolIdx]
    const underlying = contract.underlyings?.[0] as Contract
    const rewards = contract.rewards as Contract[]
    const balanceOfRes = balancesOfRes[poolIdx]
    const claimableRewardRes = claimableRewardsRes[poolIdx]
    const exchangeRateRes = exchangeRatesRes[poolIdx]
    const exchangeRate = exchangeRateRes.success ? exchangeRateRes.output : parseEther('1.0')

    if (!underlying || !rewards || !balanceOfRes.success || !claimableRewardRes.success) {
      continue
    }

    balances.push({
      ...contract,
      category: 'stake',
      amount: (balanceOfRes.output * exchangeRate) / parseEther('1.0'),
      underlyings: [underlying],
      rewards: [
        // cnc
        { ...rewards[0], amount: claimableRewardRes.output[0] },
        // crv
        { ...rewards[1], amount: claimableRewardRes.output[1] },
        // cvx
        { ...rewards[2], amount: claimableRewardRes.output[2] },
      ],
    })
  }

  return balances
}

export async function getCNCLockerBalances(ctx: BalancesContext, lockers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof abi.voteLocks>[] = []
  for (const locker of lockers) {
    // Number of iterations is not predictable but 10 seems to be a reasonable number of positions that an user locks
    for (let idx = 0; idx < 10; idx++) {
      calls.push({ target: locker.address, params: [ctx.address, BigInt(idx)] })
    }
  }

  const lockedBalancesRes = await multicall({ ctx, calls, abi: abi.voteLocks })

  for (let lockIdx = 0; lockIdx < lockers.length; lockIdx++) {
    const locker = lockers[lockIdx]
    const lockedBalanceRes = lockedBalancesRes[lockIdx]

    if (!lockedBalanceRes.success) {
      continue
    }

    const [amount, unlockTime] = lockedBalanceRes.output

    balances.push({
      ...locker,
      symbol: CNC.symbol,
      decimals: CNC.decimals,
      amount,
      unlockAt: Number(unlockTime),
      underlyings: [CNC],
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}

export async function getConicFarmBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const underlyings = contract.underlyings as Contract[]

  const [balanceOf, claimableRewards, underlyingsBalances, totalSupplies, symbol, decimals] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.balances }),
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.claimableReward }),
    call({ ctx, target: metaRegistry.address, params: [contract.pool], abi: abi.get_underlying_balances }),
    call({ ctx, target: contract.lpToken, abi: erc20Abi.totalSupply }),
    call({ ctx, target: contract.lpToken, abi: erc20Abi.symbol }),
    call({ ctx, target: contract.lpToken, abi: erc20Abi.decimals }),
  ])

  underlyings.forEach((underlying, underlyingIdx) => {
    const underlyingBalance = underlyingsBalances[underlyingIdx]
    ;(underlying as Balance).amount = (underlyingBalance * balanceOf) / totalSupplies
  })

  return {
    chain: ctx.chain,
    address: contract.lpToken,
    symbol,
    decimals,
    amount: balanceOf,
    underlyings,
    rewards: [{ ...CNC, amount: claimableRewards }],
    category: 'farm',
  }
}
