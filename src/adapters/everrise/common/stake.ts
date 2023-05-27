import type { Balance, BalancesContext, Contract, StakeBalance } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO, sumBN } from '@lib/math'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  getTotalRewards: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getTotalRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getNftData: {
    inputs: [{ internalType: 'uint256', name: 'nftId', type: 'uint256' }],
    name: 'getNftData',
    outputs: [
      {
        components: [
          { internalType: 'uint96', name: 'initialTokenAmount', type: 'uint96' },
          { internalType: 'uint96', name: 'withdrawnAmount', type: 'uint96' },
          { internalType: 'uint48', name: 'depositTime', type: 'uint48' },
          { internalType: 'uint8', name: 'numOfMonths', type: 'uint8' },
          { internalType: 'uint8', name: 'achievementClaimed', type: 'uint8' },
          { internalType: 'address', name: 'stakerAddress', type: 'address' },
          { internalType: 'uint32', name: 'nftId', type: 'uint32' },
          { internalType: 'uint32', name: 'lookupIndex', type: 'uint32' },
          { internalType: 'uint24', name: 'stakerIndex', type: 'uint24' },
          { internalType: 'uint8', name: 'isActive', type: 'uint8' },
        ],
        internalType: 'struct StakingDetails',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getEverriseBalances(ctx: BalancesContext, nftStaker: Contract): Promise<Balance[] | undefined> {
  const RISE = nftStaker.underlyings?.[0] as Contract
  if (!RISE) {
    return
  }

  const [balanceOfLength, pendingReward] = await Promise.all([
    call({
      ctx,
      target: nftStaker.address,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),
    call({
      ctx,
      target: nftStaker.address,
      params: [ctx.address],
      abi: abi.getTotalRewards,
    }),
  ])

  const tokenOfOwnerByIndexesRes = await multicall({
    ctx,
    calls: range(0, Number(balanceOfLength)).map(
      (_, idx) =>
        ({
          target: nftStaker.address,
          params: [ctx.address, BigInt(idx)],
        } as const),
    ),
    abi: abi.tokenOfOwnerByIndex,
  })

  const nftDatasRes = await multicall({
    ctx,
    calls: tokenOfOwnerByIndexesRes.map((nft) =>
      nft.success ? ({ target: nftStaker.address, params: [BigInt(nft.output)] } as const) : null,
    ),
    abi: abi.getNftData,
  })

  const totalStaking = sumBN(mapSuccessFilter(nftDatasRes, (res) => BigNumber.from(res.output.initialTokenAmount)))

  const balances: StakeBalance[] = mapSuccessFilter(nftDatasRes, (res) => {
    // Attach pro-rata rewards balances
    const rewardBalance = totalStaking
      ? BigNumber.from(pendingReward).mul(res.output.initialTokenAmount).div(totalStaking)
      : BN_ZERO

    return {
      ...nftStaker,
      amount: BigNumber.from(res.output.initialTokenAmount),
      underlyings: [RISE],
      rewards: [{ ...RISE, amount: rewardBalance }],
      category: 'stake',
    }
  })

  return balances
}
