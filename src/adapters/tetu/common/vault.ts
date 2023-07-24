import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  vaults: {
    inputs: [],
    name: 'vaults',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokens: {
    inputs: [],
    name: 'rewardTokens',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  underlying: {
    inputs: [],
    name: 'underlying',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getVault: {
    inputs: [],
    name: 'getVault',
    outputs: [{ internalType: 'contract IVault', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolId: {
    inputs: [],
    name: 'getPoolId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getTetuVaults(ctx: BaseContext, factory: Contract): Promise<Contract[]> {
  const vaults: Contract[] = []

  const vaultsRes = await call({ ctx, target: factory.address, abi: abi.vaults })

  const [rewardTokensRes, underlyingsTokensRes] = await Promise.all([
    multicall({ ctx, calls: (vaultsRes || []).map((vault) => ({ target: vault } as const)), abi: abi.rewardTokens }),
    multicall({ ctx, calls: (vaultsRes || []).map((vault) => ({ target: vault } as const)), abi: abi.underlying }),
  ])

  const underlyingsTokensFromUnderlyings = await multicall({
    ctx,
    calls: mapSuccessFilter(underlyingsTokensRes, (res) => ({ target: res.output } as const)),
    abi: abi.underlying,
  })

  for (let vaultIdx = 0; vaultIdx < vaultsRes.length; vaultIdx++) {
    const vault = vaultsRes[vaultIdx]
    const rewardTokenRes = rewardTokensRes[vaultIdx]
    const underlyingsTokenRes = underlyingsTokensRes[vaultIdx]

    if (!rewardTokenRes.success || !underlyingsTokenRes.success) {
      continue
    }

    vaults.push({
      chain: ctx.chain,
      address: vault,
      underlyings: [underlyingsTokenRes.output],
      rewards: rewardTokenRes.output as `0x${string}`[],
      underlyingsFromUnderlyings: underlyingsTokensFromUnderlyings[vaultIdx].success
        ? await getERC20Details(ctx, [underlyingsTokensFromUnderlyings[vaultIdx].output!])
        : undefined,
    })
  }

  return getBalancerUnderlyings(ctx, vaults)
}

export async function getBalancerUnderlyings(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const stdPools: Contract[] = []
  const balancerPools: Contract[] = []

  const [vaultBalancerRes, poolIdsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.underlyings![0] as `0x${string}` } as const)),
      abi: abi.getVault,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.underlyings![0] as `0x${string}` } as const)),
      abi: abi.getPoolId,
    }),
  ])

  for (const [idx, pool] of pools.entries()) {
    pool.vault = vaultBalancerRes[idx].success ? vaultBalancerRes[idx].output : undefined
    pool.poolId = poolIdsRes[idx].success ? poolIdsRes[idx].output : undefined

    if (!pool.vault || !pool.poolId) {
      stdPools.push(pool)
    } else {
      balancerPools.push(pool)
    }
  }

  const balancerTokensRes = await multicall({
    ctx,
    calls: balancerPools.map((pool) => ({ target: pool.vault, params: [pool.poolId] } as const)),
    abi: abi.getPoolTokens,
  })

  const fmtBalancerPools = await Promise.all(
    mapSuccessFilter(balancerTokensRes, async (res, idx) => {
      const pool = balancerPools[idx]
      const [tokens, _amount, _lastChange] = res.output
      const underlying = await getERC20Details(ctx, tokens)

      return { ...pool, balancerTokens: underlying }
    }),
  )

  return [...stdPools, ...fmtBalancerPools]
}
