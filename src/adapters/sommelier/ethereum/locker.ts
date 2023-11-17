import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  stakingToken: {
    inputs: [],
    name: 'stakingToken',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserStakes: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserStakes',
    outputs: [
      {
        components: [
          { internalType: 'uint112', name: 'amount', type: 'uint112' },
          { internalType: 'uint112', name: 'amountWithBoost', type: 'uint112' },
          { internalType: 'uint32', name: 'unbondTimestamp', type: 'uint32' },
          { internalType: 'uint112', name: 'rewardPerTokenPaid', type: 'uint112' },
          { internalType: 'uint112', name: 'rewards', type: 'uint112' },
          { internalType: 'enum ICellarStaking.Lock', name: 'lock', type: 'uint8' },
        ],
        internalType: 'struct ICellarStaking.UserStake[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLockerContracts(ctx: BaseContext, addresses: `0x${string}`[]): Promise<Contract[]> {
  const stakingTokens = await multicall({
    ctx,
    calls: addresses.map((address) => ({ target: address }) as const),
    abi: abi.stakingToken,
  })

  const assets = await multicall({
    ctx,
    calls: mapSuccessFilter(stakingTokens, (res) => ({ target: res.output })),
    abi: abi.asset,
  })

  return mapSuccessFilter(assets, (res, index) => {
    const address = addresses[index]
    const token = res.input.target
    const underlyings = [res.output]

    return { chain: ctx.chain, address, token, underlyings }
  })
}

export async function getSommelierLockBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userLockedBalances = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: abi.getUserStakes,
  })

  const poolBalances = mapSuccessFilter(userLockedBalances, (responses) => {
    if (responses.output.length === 0) return null

    return responses.output
      .filter((res) => res.amount > 0n)
      .map((res) => {
        const matchingPool = pools.find((pool) => pool.address === responses.input.target)
        return matchingPool ? { ...matchingPool, amount: res.amount } : null
      })
  })
    .filter(isNotNullish)
    .filter((array) => array.length > 0)
    .flat()

  const convertToAssets = await multicall({
    ctx,
    calls: (poolBalances || []).map((pool) => ({ target: pool!.token!, params: [pool!.amount] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(convertToAssets, (res, index) => {
    const poolBalance = poolBalances[index]
    const underlying = poolBalance?.underlyings?.[0] as Contract

    if (!poolBalance || !underlying) return null

    return {
      ...(poolBalance as Balance),
      underlyings: [{ ...underlying, amount: res.output }],
      category: 'lock' as Category,
    }
  }).filter(isNotNullish)
}
