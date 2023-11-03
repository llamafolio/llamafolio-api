import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakes: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'stakes',
    outputs: [
      { internalType: 'uint256', name: 'dhtAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'dhtStakeStartTime', type: 'uint256' },
      { internalType: 'address', name: 'dhedgePoolAddress', type: 'address' },
      { internalType: 'uint256', name: 'dhedgePoolAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'dhedgePoolStakeStartTime', type: 'uint256' },
      { internalType: 'uint256', name: 'stakeStartTokenPrice', type: 'uint256' },
      { internalType: 'bool', name: 'unstaked', type: 'bool' },
      { internalType: 'uint256', name: 'unstakeTime', type: 'uint256' },
      { internalType: 'uint256', name: 'reward', type: 'uint256' },
      { internalType: 'uint256', name: 'claimedReward', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardParamsEmissionsRate', type: 'uint256' },
      { internalType: 'uint256', name: 'stakeFinishTokenPrice', type: 'uint256' },
      { internalType: 'uint256', name: 'vdhtAccruedAtUnstake', type: 'uint256' },
      { internalType: 'uint256', name: 'dhedgePoolRemainingExitCooldownAtStakeTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  tokenPrice: {
    inputs: [{ internalType: 'address', name: 'poolAddress', type: 'address' }],
    name: 'tokenPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type IDHTBalance = Balance & {
  pool: `0x${string}`
  poolBalance: bigint
}

export async function getDHTStakeBalances(
  ctx: BalancesContext,
  staker: Contract,
  performer: Contract,
): Promise<Balance[]> {
  const userTokensLength = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const userTokensOwnedByIds = await multicall({
    ctx,
    calls: rangeBI(0n, userTokensLength).map((i) => ({ target: staker.address, params: [ctx.address, i] }) as const),
    abi: abi.tokenOfOwnerByIndex,
  })

  const userStakes = await multicall({
    ctx,
    calls: mapSuccessFilter(userTokensOwnedByIds, (res) => ({ target: staker.address, params: [res.output] }) as const),
    abi: abi.stakes,
  })

  const pools: IDHTBalance[] = mapSuccessFilter(userStakes, (res) => {
    const underlyings = staker.underlyings as Contract[]
    const [dhtAmount, _, dhedgePoolAddress, dhedgePoolAmount] = res.output

    const underlyings0 = { ...underlyings[0], amount: dhtAmount }

    return {
      ...staker,
      amount: 1n,
      decimals: 1,
      symbol: res.input.params[0].toString(),
      pool: dhedgePoolAddress,
      poolBalance: dhedgePoolAmount,
      underlyings: [underlyings0, underlyings[1]],
      rewards: undefined,
      category: 'stake',
    }
  })

  const underlying1PricePerFullSharesRes = await multicall({
    ctx,
    calls: pools.map(({ pool }) => ({ target: performer.address, params: [pool] }) as const),
    abi: abi.tokenPrice,
  })

  return mapSuccessFilter(underlying1PricePerFullSharesRes, (res, index) => {
    const pool = pools[index]
    const underlyings = pool.underlyings as Contract[]

    const underlying1 = { ...underlyings[1], amount: (pool.poolBalance * res.output) / parseEther('1.0') }

    return {
      ...pool,
      underlyings: [underlyings[0], underlying1],
    }
  })
}
