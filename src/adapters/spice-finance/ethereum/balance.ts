import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  ownerOf: {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenShares: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'tokenShares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSpiceStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const shareBalances = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const assetBalances = await multicall({
    ctx,
    calls: mapSuccessFilter(shareBalances, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(assetBalances, (res, index) => ({
    ...stakers[index],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))
}

export async function getSpiceNftStakeBalances(ctx: BalancesContext, vault: Contract): Promise<Balance[]> {
  const stakedNftLength = await call({ ctx, target: vault.address, abi: erc20Abi.totalSupply })

  const nftOwners = await multicall({
    ctx,
    calls: rangeBI(0n, stakedNftLength).map((i) => ({ target: vault.address, params: [i] }) as const),
    abi: abi.ownerOf,
  })

  const nftIdOwnedByUsers = mapSuccessFilter(nftOwners, (res) => {
    if (res.output.toLowerCase() === ctx.address.toLowerCase()) {
      return res.input.params[0]
    }
  })

  const nftSharesValues = await multicall({
    ctx,
    calls: (nftIdOwnedByUsers || []).map((nftId) => ({ target: vault.address, params: [nftId!] }) as const),
    abi: abi.tokenShares,
  })

  const nftAssetsValues = await multicall({
    ctx,
    calls: mapSuccessFilter(nftSharesValues, (res) => ({ target: vault.address, params: [res.output] }) as const),
    abi: abi.convertToAssets,
  })

  return mapSuccessFilter(nftAssetsValues, (res) => ({
    ...vault,
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))
}
