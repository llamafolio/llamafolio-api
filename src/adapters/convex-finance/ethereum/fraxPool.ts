import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'address', name: 'implementation', type: 'address' },
      { internalType: 'address', name: 'stakingAddress', type: 'address' },
      { internalType: 'address', name: 'stakingToken', type: 'address' },
      { internalType: 'address', name: 'rewardsAddress', type: 'address' },
      { internalType: 'uint8', name: 'active', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolVaultLength: {
    inputs: [{ internalType: 'uint256', name: '_pid', type: 'uint256' }],
    name: 'poolVaultLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolVaultList: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'poolVaultList',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const FXS: Contract = {
  chain: 'ethereum',
  address: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0',
  decimals: 18,
  symbol: 'FXS',
}

const CRV: Contract = {
  chain: 'ethereum',
  address: '0xd533a949740bb3306d119cc777fa900ba034cd52',
  decimals: 18,
  symbol: 'CRV',
}

const CVX: Contract = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  decimals: 18,
  symbol: 'CVX',
}

export async function getConvexFraxPoolsContracts(ctx: BaseContext, registry: Contract): Promise<Contract[]> {
  const poolLength = await getPoolLength(ctx, registry)
  const poolInfos = await getPoolsInfo(ctx, registry, poolLength)
  return await getVaultFromPools(ctx, registry, poolInfos)
}

async function getPoolLength(ctx: BaseContext, registry: Contract): Promise<bigint> {
  return call({ ctx, target: registry.address, abi: abi.poolLength })
}

async function getPoolsInfo(ctx: BaseContext, booster: Contract, poolLength: bigint): Promise<Contract[]> {
  const poolInfosRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: booster.address, params: [idx] }) as const),
    abi: abi.poolInfo,
  })

  return mapSuccessFilter(poolInfosRes, poolInfoMapper(ctx))
}

function poolInfoMapper(ctx: BaseContext): (res: any) => Contract {
  return (res) => {
    const [_, stakingAddress, stakingToken, _rewardsAddress] = res.output
    return {
      chain: ctx.chain,
      address: stakingAddress,
      token: stakingToken,
      rewards: [FXS, CRV, CVX],
      pid: res.input.params[0],
    }
  }
}

async function getVaultFromPools(ctx: BaseContext, registry: Contract, pools: Contract[]) {
  const poolVaultLengths = await getVaultLength(ctx, registry, pools)
  const vaultLists = await getVaultLists(ctx, registry, pools, poolVaultLengths)
  return mapPoolsWithVaults(pools, vaultLists)
}

async function getVaultLength(ctx: BaseContext, registry: Contract, pools: Contract[]) {
  const poolVaultLengths = await multicall({
    ctx,
    calls: pools.map(({ pid }) => ({ target: registry.address, params: [pid] }) as const),
    abi: abi.poolVaultLength,
  })

  return mapSuccessFilter(poolVaultLengths, (res) => ({ pid: res.input.params[0], vaultLength: res.output }))
}

async function getVaultLists(ctx: BaseContext, registry: Contract, pools: Contract[], poolVaultLengths: any[]) {
  const vaultLists = await multicall({
    ctx,
    calls: poolVaultLengths.flatMap((poolVault) =>
      rangeBI(0n, poolVault.vaultLength).map(
        (i) => ({ target: registry.address, params: [poolVault.pid, i] }) as const,
      ),
    ),
    abi: abi.poolVaultList,
  })

  return remapVaultLists(poolVaultLengths, vaultLists)
}

function remapVaultLists(poolVaultLengths: any[], vaultLists: any[]) {
  let totalVaults = 0n

  return poolVaultLengths.flatMap((poolVault) => {
    const vaultsForThisPool = Array.from({ length: Number(poolVault.vaultLength) }, (_, i) => {
      const vaultIndex = Number(totalVaults) + i
      const vault = vaultLists[vaultIndex]

      if (!vault || !vault.success) return null
      return { pid: poolVault.pid, vaultId: vault.output }
    })

    totalVaults += poolVault.vaultLength
    return vaultsForThisPool.filter(isNotNullish)
  })
}

function mapPoolsWithVaults(pools: Contract[], remappedVaults: any[]) {
  return remappedVaults.flatMap((vault) =>
    pools
      .filter((pool) => pool.pid === vault.pid)
      .map((pool) => ({ ...pool, address: vault.vaultId, staker: pool.address })),
  )
}
