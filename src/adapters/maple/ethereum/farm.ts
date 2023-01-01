import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { getERC20BalanceOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

export async function getFarmContracts(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const getPoolsNumber = await call({
    chain: ctx.chain,
    target: contract.address,
    params: [],
    abi: {
      inputs: [],
      name: 'poolsCreated',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const getPoolsAddresses = await multicall({
    chain: ctx.chain,
    calls: range(0, getPoolsNumber.output).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: {
      inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      name: 'pools',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const poolsAddresses = getPoolsAddresses.filter(isSuccess).map((res) => res.output)

  const getUnderlyingsTokensAddresses = await multicall({
    chain: ctx.chain,
    calls: poolsAddresses.map((pool) => ({
      target: pool,
      params: [],
    })),
    abi: {
      inputs: [],
      name: 'liquidityAsset',
      outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  for (let poolIdx = 0; poolIdx < poolsAddresses.length; poolIdx++) {
    const pool = poolsAddresses[poolIdx]
    const underlyingRes = getUnderlyingsTokensAddresses[poolIdx]

    if (!isSuccess(underlyingRes)) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: pool,
      underlyings: [underlyingRes.output],
      rewards: [underlyingRes.output],
    })
  }

  return contracts
}

export async function getFarmBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const farmBalances: Balance[] = []

  const balances = await getERC20BalanceOf(ctx, contracts as Token[])

  const getRewards = await multicall({
    chain: ctx.chain,
    calls: balances.map((balance) => ({
      target: balance.address,
      params: [ctx.address],
    })),
    abi: {
      inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
      name: 'accumulativeFundsOf',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const rewards = getRewards.filter((res) => res.success).map((res) => BigNumber.from(res.output))

  for (let i = 0; i < balances.length; i++) {
    const balance = balances[i]
    const reward = rewards[i]

    farmBalances.push({
      ...balance,
      rewards: [{ ...(balance.rewards?.[0] as Balance), amount: reward }],
      category: 'farm',
    })
  }

  return farmBalances
}
