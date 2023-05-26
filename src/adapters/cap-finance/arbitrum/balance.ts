import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getCurrencyBalance: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getCurrencyBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getBalance: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserPoolBalance: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserPoolBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getClaimableRewards: {
    inputs: [
      { internalType: 'address[]', name: 'assets', type: 'address[]' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getClaimableRewards',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserBalances: {
    inputs: [
      { internalType: 'address[]', name: '_assets', type: 'address[]' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getUserBalances',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const CAP: Token = {
  chain: 'arbitrum',
  address: '0x031d35296154279DC1984dCD93E392b1f946737b',
  decimals: 18,
  symbol: 'CAP',
}

const WETH: Token = {
  chain: 'arbitrum',
  address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  decimals: 18,
  symbol: 'WETH',
}

const USDC: Token = {
  chain: 'arbitrum',
  address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  decimals: 6,
  symbol: 'USDC',
}

export async function getDepositBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = []
  for (const contract of contracts) {
    calls.push({ target: contract.address, params: [ctx.address] })
  }

  const getCurrencyBalancesOf = await multicall({ ctx, calls, abi: abi.getCurrencyBalance })

  for (let poolIdx = 0; poolIdx < contracts.length; poolIdx++) {
    const contract = contracts[poolIdx]
    const underlying = contract.underlyings?.[0] as Contract
    const getCurrencyBalanceOf = getCurrencyBalancesOf[poolIdx]

    if (!underlying || !isSuccess(getCurrencyBalanceOf)) {
      continue
    }

    balances.push({
      ...contract,
      amount: BigNumber.from(getCurrencyBalanceOf.output),
      symbol: underlying.symbol,
      decimals: 18,
      underlyings: [underlying],
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}

export async function getStakeBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfsRes, pendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.staker, params: [ctx.address], abi: abi.getBalance })),
      abi: abi.getBalance,
    }),
    multicall({
      ctx,
      // @ts-ignore
      calls: contracts.map((contract) => ({
        target: contract.rewarder,
        params: [
          ['0x0000000000000000000000000000000000000000', '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'],
          ctx.address,
        ],
      })),
      abi: abi.getClaimableRewards,
    }),
  ])

  for (let idx = 0; idx < contracts.length; idx++) {
    const contract = contracts[idx]
    const rewards = contract.rewards as Contract[]
    const balanceOfRes = balanceOfsRes[idx]
    const pendingRewardRes = pendingRewardsRes[idx]

    if (!isSuccess(balanceOfRes)) {
      continue
    }

    const balance: Balance = {
      ...contract,
      amount: BigNumber.from(balanceOfRes.output),
      symbol: CAP.symbol,
      decimals: 18,
      underlyings: [CAP],
      rewards: [],
      category: 'stake',
    }

    if (rewards) {
      rewards.forEach((token, idx) => {
        const rewardsAmount = isSuccess(pendingRewardRes) ? BigNumber.from(pendingRewardRes.output[idx]) : BN_ZERO
        const reward = { ...token, amount: rewardsAmount }
        balance.rewards!.push(reward)
      })
    }

    balances.push(balance)
  }

  return balances
}

export async function getYieldBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const underlying = contract.underlyings?.[0] as Contract

  const userBalances = await call({
    ctx,
    target: contract.lpToken,
    params: [ctx.address],
    abi: abi.getUserPoolBalance,
  })

  return {
    ...contract,
    decimals: underlying.decimals,
    symbol: underlying.symbol,
    amount: BigNumber.from(userBalances),
    underlyings: [underlying],
    rewards: undefined,
    category: 'farm',
  }
}

export async function getDepositV2Balances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balanceOfsRes = await call({
    ctx,
    target: contract.pool,
    params: [['0x0000000000000000000000000000000000000000', '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'], ctx.address],
    abi: abi.getUserBalances,
  })

  const ethBalances: Balance = {
    chain: ctx.chain,
    address: contract.address,
    decimals: WETH.decimals,
    symbol: WETH.symbol,
    amount: BigNumber.from(balanceOfsRes[0]),
    underlyings: [WETH],
    rewards: undefined,
    category: 'stake',
  }

  const usdcBalances: Balance = {
    chain: ctx.chain,
    address: contract.address,
    decimals: USDC.decimals,
    symbol: USDC.symbol,
    amount: BigNumber.from(balanceOfsRes[1]),
    underlyings: [USDC],
    rewards: undefined,
    category: 'stake',
  }

  return [ethBalances, usdcBalances]
}
