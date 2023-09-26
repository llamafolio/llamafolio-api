import type { BaseContext, Contract } from '@lib/adapter'
import { ADDRESS_ZERO } from '@lib/contract'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  stakingToken: {
    constant: true,
    inputs: [],
    name: 'stakingToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  rewardsToken: {
    constant: true,
    inputs: [],
    name: 'rewardsToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const API_URL = 'https://raw.githubusercontent.com/hop-protocol/hop/develop/packages/core/build/addresses/mainnet.json'

export async function getHopPools(ctx: BaseContext): Promise<{ pools: Contract[]; farmers: Contract[] }> {
  const { bridges, rewardsContracts } = await fetch(API_URL).then((response) => response.json())

  const filteredVaults = filterVaults(bridges, ctx.chain)
  const pools: any[] = mapVaults(filteredVaults, ctx.chain)
  const rawFarmers = formatRewardsContracts(rewardsContracts, ctx.chain)

  const [lpTokensRes, rewardsTokensRes] = await Promise.all([
    multicall({
      ctx,
      calls: rawFarmers.map((farmer) => ({ target: farmer.address }) as const),
      abi: abi.stakingToken,
    }),
    multicall({
      ctx,
      calls: rawFarmers.map((farmer) => ({ target: farmer.address }) as const),
      abi: abi.rewardsToken,
    }),
  ])

  const farmers = rawFarmers.map((farmer, idx) => {
    const lpTokenRes = lpTokensRes[idx]
    const rewardTokensRes = rewardsTokensRes[idx]

    if (!lpTokenRes.success || !rewardTokensRes.success) return null

    return {
      ...farmer,
      token: lpTokenRes.output,
      rewards: [rewardTokensRes.output],
    }
  })

  const mergedFarmers = farmers.map((farmer) => {
    const correspondingPool = pools.find((pool) => pool.address.toLowerCase() === farmer.token.toLowerCase())
    return correspondingPool ? { ...correspondingPool, ...farmer } : farmer
  })

  return { pools, farmers: mergedFarmers }
}

function formatRewardsContracts(rewardsContracts: Record<string, any>, chain: string) {
  return Object.keys(rewardsContracts).flatMap((key) => {
    const contractForChain = rewardsContracts[key][chain]
    if (!contractForChain) return []
    return contractForChain.map((address: string) => ({ chain, address }))
  })
}

function filterVaults(bridges: Record<string, any>, chain: string) {
  return Object.keys(bridges).reduce((acc: any, key) => {
    if (bridges[key][chain]) {
      acc[key] = Object.keys(bridges[key][chain])
        .filter((prop) => ['l2CanonicalToken', 'l2HopBridgeToken', 'l2SaddleSwap', 'l2SaddleLpToken'].includes(prop))
        .reduce((filteredProps, prop) => {
          filteredProps[prop as keyof any] = bridges[key][chain][prop]
          return filteredProps
        }, {} as any)
    }
    return acc
  }, {})
}

function mapVaults(vaults: Record<string, any>, chain: string) {
  return Object.keys(vaults)
    .map((key) => {
      const { l2SaddleSwap, l2SaddleLpToken, l2CanonicalToken, l2HopBridgeToken } = vaults[key]
      if (l2SaddleSwap === ADDRESS_ZERO) return null

      return {
        chain,
        address: l2SaddleLpToken,
        lpToken: l2SaddleSwap,
        underlyings: [l2CanonicalToken, l2HopBridgeToken],
      }
    })
    .filter(isNotNullish)
}
