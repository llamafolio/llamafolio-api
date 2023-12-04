import { getBeethovenUnderlyings } from '@adapters/beethoven-x/common/pool'
import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: 'pools', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  positions: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'relicPositionsOfOwner',
    outputs: [
      { internalType: 'uint256[]', name: 'relicIds', type: 'uint256[]' },
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
          { internalType: 'uint256', name: 'rewardCredit', type: 'uint256' },
          { internalType: 'uint256', name: 'entry', type: 'uint256' },
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'uint256', name: 'level', type: 'uint256' },
        ],
        internalType: 'struct PositionInfo[]',
        name: 'positionInfos',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [{ internalType: 'uint256', name: 'relicId', type: 'uint256' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type BeethovenBalances = IBalancerBalance & {
  relicId: bigint
}

const BEETS: Contract = {
  chain: 'fantom',
  address: '0xf24bcf4d1e507740041c9cfd2dddb29585adce1e',
  decimals: 18,
  symbol: 'BEETS',
}

export async function getReliquaryContracts(ctx: BaseContext, reliquary: Contract): Promise<Contract[]> {
  const poolLength = await call({ ctx, target: reliquary.address, abi: abi.poolLength })

  const poolInfos = await multicall({
    ctx,
    // First is a test address
    calls: rangeBI(1n, poolLength).map((idx) => ({ target: reliquary.address, params: [idx] }) as const),
    abi: abi.poolToken,
  })

  const pools = mapSuccessFilter(poolInfos, (res) => {
    const lpToken = res.output
    return { chain: ctx.chain, address: lpToken, pid: res.input.params![0] }
  })

  return getBeethovenUnderlyings(ctx, { pools })
}

export async function getReliquaryBalances(
  ctx: BalancesContext,
  pools: Contract[],
  reliquary: Contract,
  vault: Contract,
): Promise<Balance[]> {
  const userPositions = await call({
    ctx,
    target: reliquary.address,
    params: [ctx.address],
    abi: abi.positions,
  })

  const relicsIds = userPositions[0]
  const infos = userPositions[1]

  const rawPoolBalances: BeethovenBalances[] = relicsIds
    .map((relicId, index) => {
      const { amount, poolId } = infos[index]
      const matchingPool = pools.find((pool) => pool.pid == poolId)

      if (!matchingPool) {
        return null
      }

      return {
        ...(matchingPool as IBalancerBalance),
        amount,
        relicId,
        category: 'farm' as Category,
      }
    })
    .filter(isNotNullish)

  const pendingRewards = await multicall({
    ctx,
    calls: rawPoolBalances.map(({ relicId }) => ({ target: reliquary.address, params: [relicId] }) as const),
    abi: abi.pendingReward,
  })

  const poolBalances = mapSuccessFilter(pendingRewards, (res, index) => ({
    ...rawPoolBalances[index],
    rewards: [{ ...BEETS, amount: res.output }],
  }))

  return getUnderlyingsBalancesFromBalancer(ctx, poolBalances as IBalancerBalance[], vault)
}
