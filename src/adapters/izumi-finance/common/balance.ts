import { getTokenIdsBalances } from '@adapters/uniswap-v3/common/pools'
import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getTokenIds: {
    inputs: [
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'getTokenIds',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'pendingReward',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getIzumiBalances(
  ctx: BalancesContext,
  pools: Contract[],
  nonFungiblePositionManager: Contract,
  factory: Contract,
  IZI: Token,
): Promise<Balance[]> {
  const tokenIdsRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
    abi: abi.getTokenIds,
  })

  const tokenIds = mapSuccessFilter(tokenIdsRes, (res) => res.output).flat()

  const balances = await getTokenIdsBalances(ctx, nonFungiblePositionManager, factory, tokenIds)

  const iziRewardsRes = await multicall({
    ctx,
    calls: pools.flatMap((pool) => tokenIds.map((token) => ({ target: pool.address, params: token }))),
    abi: abi.pendingReward,
  })

  balances.forEach((balance, balanceIdx) => {
    const iziRewardRes = iziRewardsRes[balanceIdx]
    const rewardsAmount = isSuccess(iziRewardRes) ? BigNumber.from(iziRewardRes.output[0]) : BN_ZERO

    balance.rewards?.push({ ...IZI, amount: rewardsAmount })
    balance.category = 'farm'
  })

  return balances
}
