import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  get_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[4]' }],
    gas: 20435,
  },
} as const

type ICurveBalance = Balance & {
  registryId?: string
  registry: `0x${string}`
  pool: `0x${string}`
  totalSupply: bigint
}

const blacklist = [
  { chain: 'avalanche', registryId: 'stableSwap' },
  { chain: 'fantom', registryId: 'stableSwap' },
  { chain: 'polygon', registryId: 'stableSwap' },
  { chain: 'ethereum', address: '0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8' },
  { chain: 'ethereum', address: '0x3b3ac5386837dc563660fb6a0937dfaa5924333b' },
  { chain: 'ethereum', address: '0x05ca5c01629a8e5845f12ea3a03ff7331932233a' },
  { chain: 'ethereum', address: '0xf5194c3325202f456c95c1cf0ca36f8475c1949f' },
  { chain: 'ethereum', address: '0x64E3C23bfc40722d3B649844055F1D51c1ac041d' },
]

function isInBlacklist(item: any) {
  return blacklist.some((blacklistedItem) =>
    Object.entries(blacklistedItem).every(([key, value]) => item[key] === value),
  )
}

export async function getUnderlyingsBalancesFromCurve(
  ctx: BalancesContext,
  poolBalances: ICurveBalance[],
  registry?: `0x${string}`,
): Promise<Balance[]> {
  const processedBalances: ICurveBalance[] = registry
    ? poolBalances.map((balance) => ({ ...balance, registry }))
    : poolBalances.filter((balance) => balance.registry)

  const [totalSuppliesRes, getUnderlyingBalancesOfRes, getTokensBalancesOfRes] = await Promise.all([
    multicall({
      ctx,
      calls: processedBalances.map((poolBalance) => ({ target: poolBalance.token! }) as const),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: processedBalances.map(
        (poolBalance) => ({ target: poolBalance.registry, params: [poolBalance.pool] }) as const,
      ),
      abi: abi.get_underlying_balances,
    }),
    multicall({
      ctx,
      calls: processedBalances.map(
        (poolBalance) => ({ target: poolBalance.registry, params: [poolBalance.pool] }) as const,
      ),
      abi: abi.get_balances,
    }),
  ])

  const formattedBalances = mapMultiSuccessFilter(
    processedBalances.map((_, i) => [totalSuppliesRes[i], getTokensBalancesOfRes[i]]),

    (res, poolIdx) => {
      const poolBalance = processedBalances[poolIdx]
      const underlyings = poolBalance.underlyings as Contract[]
      const underlyingBalancesOf = getUnderlyingBalancesOfRes[poolIdx]
      const [{ output: totalSupply }, { output: tokensBalancesOf }] = res.inputOutputPairs

      if (!underlyings || totalSupply === 0n) return null

      const underlyingBalances = underlyingBalancesOf.success ? underlyingBalancesOf.output : tokensBalancesOf

      underlyings.forEach((underlying, index) => {
        const underlyingBalance = underlyingBalances[index]
        const decimals = determineDecimals(ctx, poolBalance, underlying)
        const amount = (underlyingBalance * poolBalance.amount) / totalSupply || 0n

        underlying.amount = amount
        underlying.decimals = decimals
      })

      return {
        ...poolBalance,
        underlyings,
        category: poolBalance.category,
      }
    },
  )

  return formattedBalances.filter(isNotNullish)
}

function determineDecimals(ctx: BalancesContext, poolBalance: ICurveBalance, underlying: Contract) {
  const isBlacklistedByChainOrAddress =
    isInBlacklist({ chain: ctx.chain, registryId: poolBalance.registryId }) ||
    isInBlacklist({ chain: ctx.chain, address: poolBalance.address })

  return isBlacklistedByChainOrAddress ? 18 : underlying.decimals
}
