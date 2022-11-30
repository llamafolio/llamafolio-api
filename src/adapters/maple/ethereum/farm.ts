import { Balance, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf, resolveERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

export async function getFarmContracts(chain: Chain, contract: Contract) {
  const contracts: Contract[] = []

  const getPoolsNumber = await call({
    chain,
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
    chain,
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

  const poolsAddresses = getPoolsAddresses.filter((res) => res.success).map((res) => res.output)

  const getUnderlyingsTokensAddresses = await multicall({
    chain,
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

  const { pools, underlyings } = await resolveERC20Details(chain, {
    pools: poolsAddresses,
    underlyings: getUnderlyingsTokensAddresses.map((res) => res.output),
  })

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const underlying = underlyings[i]

    if (!isSuccess(pool) || !isSuccess(underlying)) {
      continue
    }

    contracts.push({
      ...pool.output,
      underlyings: [underlying.output],
      rewards: [underlying.output],
    })
  }

  return contracts
}

export async function getFarmBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]): Promise<Balance[]> {
  const farmBalances: Balance[] = []

  const balances = await getERC20BalanceOf(ctx, chain, contracts as Token[])

  const getRewards = await multicall({
    chain,
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
