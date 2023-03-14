import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'
import { groupBy } from 'lodash'

import { getBalancerProviderBalances } from './providers/balancerProvider'
import { getGroProviderBalances } from './providers/groProvider'
import { getSushiProviderBalances } from './providers/sushiProvider'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  claimable: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getGroBalances(
  ctx: BalancesContext,
  contracts: Contract[],
  masterchef: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userInfosBalancesRes, claimableBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: masterchef.address, params: [contract.pid, ctx.address] })),
      abi: abi.userInfo,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: masterchef.address, params: [contract.pid, ctx.address] })),
      abi: abi.claimable,
    }),
  ])

  for (let poolIdx = 0; poolIdx < contracts.length; poolIdx++) {
    const contract = contracts[poolIdx]
    const underlyings = contract.underlyings as Contract[]
    const reward = contract.rewards?.[0] as Contract
    const userInfosBalanceRes = userInfosBalancesRes[poolIdx]
    const claimableBalanceRes = claimableBalancesRes[poolIdx]

    if (!isSuccess(userInfosBalanceRes) || !isSuccess(claimableBalanceRes)) {
      continue
    }

    balances.push({
      ...contract,
      amount: BigNumber.from(userInfosBalanceRes.output.amount),
      underlyings,
      rewards: [{ ...reward, amount: BigNumber.from(claimableBalanceRes.output) }],
    })
  }

  return (await getUnderlyingsBalances(ctx, balances)).map((res) => ({ ...res, category: 'farm' }))
}

type Provider = (ctx: BalancesContext, pools: Balance[]) => Promise<Balance[]>

const providers: Record<string, Provider | undefined> = {
  0: getGroProviderBalances,
  1: getSushiProviderBalances,
  2: getSushiProviderBalances,
  3: getGroProviderBalances,
  4: getGroProviderBalances,
  5: getBalancerProviderBalances,
  6: getGroProviderBalances,
}

const getUnderlyingsBalances = async (ctx: BalancesContext, balances: Balance[]): Promise<Balance[]> => {
  // resolve underlyings
  const poolsByPid = groupBy(balances, 'pid')

  return (
    await Promise.all(
      Object.keys(poolsByPid).map((pid) => {
        const providerFn = providers[pid]
        if (!providerFn) {
          return poolsByPid[pid] as Balance[]
        }

        return providerFn(ctx, poolsByPid[pid] as Balance[])
      }),
    )
  ).flat()
}
