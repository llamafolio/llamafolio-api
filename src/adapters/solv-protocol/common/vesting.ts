import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

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
  unitsInToken: {
    inputs: [{ internalType: 'uint256', name: 'tokenId_', type: 'uint256' }],
    name: 'unitsInToken',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getVestingSnapshot: {
    inputs: [{ internalType: 'uint256', name: 'tokenId_', type: 'uint256' }],
    name: 'getVestingSnapshot',
    outputs: [
      { internalType: 'uint8', name: '', type: 'uint8' },
      { internalType: 'uint64', name: '', type: 'uint64' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint64[]', name: '', type: 'uint64[]' },
      { internalType: 'uint32[]', name: '', type: 'uint32[]' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'string', name: '', type: 'string' },
      { internalType: 'bool', name: '', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSolvVestingBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userTokensLengths = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const userTokensIds = await multicall({
    ctx,
    calls: mapSuccessFilter(userTokensLengths, (res) => {
      return rangeBI(0n, res.output).map((i) => {
        return { target: res.input.target, params: [ctx.address, i] } as const
      })
    }).flat(),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokensInfos = await multicall({
    ctx,
    calls: mapSuccessFilter(
      userTokensIds,
      (res) =>
        ({
          target: pools.find((pool) => pool.address === res.input.target)!.vestingPool,
          params: [res.output],
        }) as const,
    ),
    abi: abi.getVestingSnapshot,
  })

  return mapSuccessFilter(tokensInfos, (res) => {
    const resolvePool = pools.find((pool) => pool.vestingPool === res.input.target)
    const [_, __, ___, balance, end, ____, claimable] = res.output
    const unlockAt = Number(end)

    if (!resolvePool || !unlockAt) return null

    const underlying = resolvePool.underlyings?.[0] as Contract

    return {
      ...resolvePool,
      amount: 1n,
      unlockAt,
      claimable: claimable / 10n ** BigInt(underlying.decimals! - 1),
      underlyings: [{ ...underlying, amount: balance }],
      rewards: undefined,
      category: 'vest' as Category,
    }
  }).filter(isNotNullish)
}
