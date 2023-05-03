import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isNotNullish, isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

import { getAccruedBLUSD } from './chickenBondManager'

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

export async function getActiveBondsBalances(ctx: BalancesContext, bondNFT: Contract) {
  const LUSD = bondNFT.underlyings?.[0]
  const bLUSD = bondNFT.rewards?.[0]
  if (!LUSD || !bLUSD) {
    return []
  }

  const balances: Balance[] = []

  const balanceOfRes = await call({
    ctx,
    target: bondNFT.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const bondsLength = balanceOfRes.output

  const tokenOfOwnerByIndexRes = await multicall({
    ctx,
    calls: range(0, bondsLength).map((bondIdx) => ({
      target: bondNFT.address,
      params: [ctx.address, bondIdx],
    })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokenIDs = tokenOfOwnerByIndexRes.filter(isSuccess).map((res) => parseInt(res.output))

  const bondStatusRes = await multicall({
    ctx,
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

  const [bondAmountsRes, accruedBLUSDRes] = await Promise.all([
    multicall({
      ctx,
      calls: activeTokenIDs.map((tokenID) => ({
        target: bondNFT.address,
        params: [tokenID],
      })),
      abi: abi.getBondAmount,
    }),
    getAccruedBLUSD(ctx, activeTokenIDs),
  ])

  for (let tokenIdx = 0; tokenIdx < activeTokenIDs.length; tokenIdx++) {
    const bondAmountRes = bondAmountsRes[tokenIdx]
    const bLUSDRes = accruedBLUSDRes[tokenIdx]

    const balance: Balance = {
      ...LUSD,
      category: 'stake',
      amount: BN_ZERO,
    }

    if (isSuccess(bondAmountRes)) {
      balance.amount = BigNumber.from(bondAmountRes.output)
    }

    if (isSuccess(bLUSDRes)) {
      balance.rewards = [{ ...bLUSD, amount: BigNumber.from(bLUSDRes.output) }]
    }

    balances.push(balance)
  }

  return balances
}
