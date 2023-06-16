import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  ownerOf: {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'ownerOf',
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
  tokenBalanceOf: {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenID',
        type: 'uint256',
      },
    ],
    name: 'tokenBalanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  sherRewards: {
    inputs: [
      {
        internalType: 'uint256',
        name: '_tokenID',
        type: 'uint256',
      },
    ],
    name: 'sherRewards',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const SHER: Token = {
  chain: 'ethereum',
  address: '0x46D2A90153cd8F09464CA3a5605B6BBeC9C2fF01',
  decimals: 18,
  symbol: 'SHER',
}

const USDC: Token = {
  chain: 'ethereum',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
}

export async function getSherlockBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  // There is no way to know in advance the number of sherlock's nft issued, currently there seems to be 685, so iterating through 1000 seems to be wise for now
  const COUNT = 1000n

  const nftListsRes = await multicall({
    ctx,
    calls: rangeBI(0n, COUNT).map((idx) => ({ target: staker.address, params: [idx] } as const)),
    abi: abi.ownerOf,
  })

  const ownerOfNftsLists = mapSuccessFilter(nftListsRes, (res, idx) => ({
    user: res.output.toLowerCase(),
    nftId: idx,
  }))

  const nftsOwnedByUser = ownerOfNftsLists.filter((list) => list.user === ctx.address.toLowerCase())

  const [nftsBalanceOfsRes, nftsPendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: nftsOwnedByUser.map((nft) => ({ target: staker.address, params: [BigInt(nft.nftId)] } as const)),
      abi: abi.tokenBalanceOf,
    }),
    multicall({
      ctx,
      calls: nftsOwnedByUser.map((nft) => ({ target: staker.address, params: [BigInt(nft.nftId)] } as const)),
      abi: abi.sherRewards,
    }),
  ])

  for (let nftIdx = 0; nftIdx < nftsOwnedByUser.length; nftIdx++) {
    const nftOwnedByUser = nftsOwnedByUser[nftIdx]
    const nftsBalanceOfRes = nftsBalanceOfsRes[nftIdx]
    const nftsPendingRewardRes = nftsPendingRewardsRes[nftIdx]

    if (!nftsBalanceOfRes.success || !nftsPendingRewardRes.success) {
      continue
    }

    balances.push({
      ...staker,
      symbol: `SHER-POS-#${nftOwnedByUser.nftId}`,
      decimals: 18,
      amount: 1n,
      underlyings: [{ ...USDC, amount: nftsBalanceOfRes.output }],
      rewards: [{ ...SHER, amount: nftsPendingRewardRes.output }],
      category: 'farm',
    })
  }

  return balances
}
