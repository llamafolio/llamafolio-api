import { BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { isNotNullish, isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const BondStatus = {
  nonExistent: 0,
  active: 1,
  chickenedOut: 2,
  chickenedIn: 3,
}

const abi = {
  balanceOf: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getBondAmount: {
    inputs: [{ internalType: 'uint256', name: '_tokenID', type: 'uint256' }],
    name: 'getBondAmount',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getBondStatus: {
    inputs: [{ internalType: 'uint256', name: '_tokenID', type: 'uint256' }],
    name: 'getBondStatus',
    outputs: [{ internalType: 'uint8', name: 'status', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
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
}

export async function getActiveBondsBalances(ctx: BalancesContext, _chain: Chain, bondNFT: Contract) {
  const balanceOfRes = await call({
    chain: ctx.chain,
    target: bondNFT.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const bondsLength = balanceOfRes.output

  const tokenOfOwnerByIndexRes = await multicall({
    chain: ctx.chain,
    calls: range(0, bondsLength).map((bondIdx) => ({
      target: bondNFT.address,
      params: [ctx.address, bondIdx],
    })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokenIDs = tokenOfOwnerByIndexRes.filter(isSuccess).map((res) => parseInt(res.output))

  const bondStatusRes = await multicall({
    chain: ctx.chain,
    calls: tokenIDs.map((tokenID) => ({
      target: bondNFT.address,
      params: [tokenID],
    })),
    abi: abi.getBondStatus,
  })

  const activeTokenIDs = bondStatusRes
    .filter(isSuccess)
    .map((res) => (parseInt(res.output) === BondStatus.active ? res.input.params[0] : null))
    .filter(isNotNullish)

  const bondAmountsRes = await multicall({
    chain: ctx.chain,
    calls: activeTokenIDs.map((tokenID) => ({
      target: bondNFT.address,
      params: [tokenID],
    })),
    abi: abi.getBondAmount,
  })

  return bondAmountsRes.filter(isSuccess).map((bondAmountRes) => ({
    ...bondNFT.underlyings?.[0],
    amount: BigNumber.from(bondAmountRes.output),
  }))
}
