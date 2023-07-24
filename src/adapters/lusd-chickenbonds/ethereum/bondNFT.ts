import type { Balance, BalancesContext, BaseContract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

import type { ChickenBondManager } from './chickenBondManager'
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
} as const

export async function getActiveBondsBalances(ctx: BalancesContext, chickenBondManager: ChickenBondManager) {
  const LUSD = chickenBondManager.underlyings?.[0] as BaseContract
  const bLUSD = chickenBondManager.rewards?.[0] as BaseContract
  if (!LUSD || !bLUSD) {
    return []
  }

  const balances: Balance[] = []

  const balanceOfRes = await call({
    ctx,
    target: chickenBondManager.bondNFT,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const tokenOfOwnerByIndexRes = await multicall({
    ctx,
    calls: rangeBI(0n, balanceOfRes).map(
      (bondIdx) => ({ target: chickenBondManager.bondNFT, params: [ctx.address, bondIdx] }) as const,
    ),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokenIDs = mapSuccessFilter(tokenOfOwnerByIndexRes, (res) => res.output)

  const bondStatusRes = await multicall({
    ctx,
    calls: tokenIDs.map((tokenID) => ({ target: chickenBondManager.bondNFT, params: [tokenID] }) as const),
    abi: abi.getBondStatus,
  })

  const activeTokenIDs = mapSuccessFilter(bondStatusRes, (res) =>
    res.output === BondStatus.active ? res.input.params[0] : null,
  )

  const [bondAmountsRes, accruedBLUSDRes] = await Promise.all([
    multicall({
      ctx,
      calls: activeTokenIDs.map((tokenID) => ({ target: chickenBondManager.bondNFT, params: [tokenID] }) as const),
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
      amount: 0n,
    }

    if (bondAmountRes.success) {
      balance.amount = bondAmountRes.output
    }

    if (bLUSDRes.success) {
      balance.rewards = [{ ...bLUSD, amount: bLUSDRes.output }]
    }

    balances.push(balance)
  }

  return balances
}
