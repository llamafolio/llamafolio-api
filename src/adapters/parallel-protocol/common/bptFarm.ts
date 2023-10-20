import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  stake: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'stake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingMIMO: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingMIMO',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getBalance: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getParallelBPT_v2FarmBalances(ctx: BalancesContext, bptFarmers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = await getParallelBalancesInternal(ctx, bptFarmers)

  return getUnderlyingsBalancesFromBalancer(ctx, balances as IBalancerBalance[], undefined, {
    getAddress: (balance: Balance) => balance.token!,
    getCategory: (balance: Balance) => balance.category,
  })
}

export async function getParallelBPT_v1FarmBalances(ctx: BalancesContext, bptFarmers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = await getParallelBalancesInternal(ctx, bptFarmers)

  const [token0BalancesRes, token1BalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: balances.map(
        (balance) => ({ target: balance.token!, params: [balance.underlyings![0].address] }) as const,
      ),
      abi: abi.getBalance,
    }),
    multicall({
      ctx,
      calls: balances.map(
        (balance) => ({ target: balance.token!, params: [balance.underlyings![1].address] }) as const,
      ),
      abi: abi.getBalance,
    }),
    multicall({
      ctx,
      calls: balances.map((balance) => ({ target: balance.token! }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  return mapMultiSuccessFilter(
    token0BalancesRes.map((_, i) => [token0BalancesRes[i], token1BalancesRes[i], totalSuppliesRes[i]]),
    (res, index) => {
      const balance = balances[index]
      const { amount, underlyings, rewards } = balance as {
        amount: bigint
        underlyings: Contract[]
        rewards: Contract[]
      }

      if (!amount || !underlyings || !rewards) return null

      const [{ output: token0Balances }, { output: token1Balances }, { output: totalSupply }] = res.inputOutputPairs

      if (totalSupply === 0n) return null

      const underlying0 = { ...underlyings[0], amount: (token0Balances * amount) / totalSupply }
      const underlying1 = { ...underlyings[1], amount: (token1Balances * amount) / totalSupply }

      return {
        ...balance,
        amount,
        underlyings: [underlying0, underlying1],
        rewards,
        category: 'farm',
      }
    },
  ).filter(isNotNullish) as Balance[]
}

export async function getParallelBalancesInternal(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, userPendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: abi.stake,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: abi.pendingMIMO,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [userBalancesRes[i], userPendingRewardsRes[i]]),
    (res, index) => {
      const contract = contracts[index]
      const { underlyings, rewards } = contract as { underlyings: Contract[]; rewards: Contract[] }

      if (!underlyings || !rewards) return null

      const [{ output: userBalancesRes }, { output: userPendingRewardsRes }] = res.inputOutputPairs

      return {
        ...contract,
        amount: userBalancesRes,
        underlyings,
        rewards: [{ ...rewards?.[0], amount: userPendingRewardsRes }],
        category: 'farm',
      }
    },
  ).filter(isNotNullish) as Balance[]
}
