import type { ProviderBalancesParams } from '@adapters/badger-dao/common/provider'
import { getArrakisProvider } from '@adapters/synthetix/common/provider/arrakis'
import { getBalancerProvider } from '@adapters/synthetix/common/provider/balancer'
import { getCurveProvider } from '@adapters/synthetix/common/provider/curve'
import { getSnxProvider } from '@adapters/synthetix/common/provider/snx'
import { getUniswapProvider } from '@adapters/synthetix/common/provider/uniswap'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { groupBy } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const SNX: { [key: string]: Contract } = {
  ethereum: {
    chain: 'ethereum',
    address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
    decimals: 18,
    symbol: 'SNX',
  },
  optimism: {
    chain: 'optimism',
    address: '0x8700daec35af8ff88c16bdf0418774cb3d7599b4',
    decimals: 18,
    symbol: 'SNX',
  },
}

export async function getSNXFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof abi.earned>[] = pools.map((pool) => ({
    target: pool.address,
    params: [ctx.address],
  }))

  const [balanceOfsRes, earnedsRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const balanceOfRes = balanceOfsRes[poolIdx]
    const earnedRes = earnedsRes[poolIdx]

    if (!balanceOfRes.success || balanceOfRes.output === 0n || !earnedRes.success) {
      continue
    }

    balances.push({
      ...pool,
      address: pool.token!,
      amount: balanceOfRes.output,
      underlyings: pool.underlyings as Contract[],
      rewards: [{ ...SNX[ctx.chain], amount: earnedRes.output }],
      category: 'farm',
    })
  }

  return getUnderlyingsBadgerBalances(ctx, balances)
}

type Provider = (ctx: BalancesContext, pools: ProviderBalancesParams[]) => Promise<(ProviderBalancesParams | Balance)[]>

const providers: Record<string, Provider | undefined> = {
  snx: getSnxProvider,
  arrakis: getArrakisProvider,
  balancer: getBalancerProvider,
  curve: getCurveProvider,
  uniswap: getUniswapProvider,
}

const getUnderlyingsBadgerBalances = async (ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> => {
  // add totalSupply, required to get some formatted underlyings balances
  const totalSuppliesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.token! })),
    abi: erc20Abi.totalSupply,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    if (totalSupplyRes.success) {
      pools[poolIdx].totalSupply = totalSupplyRes.output
    }
  }

  // resolve underlyings
  const poolsByProvider = groupBy(pools, 'provider')

  return (
    await Promise.all(
      Object.keys(poolsByProvider).map((providerId) => {
        const providerFn = providers[providerId]
        if (!providerFn) {
          return poolsByProvider[providerId] as Balance[]
        }

        return providerFn(ctx, poolsByProvider[providerId] as ProviderBalancesParams[])
      }),
    )
  ).flat()
}
