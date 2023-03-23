import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'uint256', name: '_tokenIndex', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  locked: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'locked',
    outputs: [
      { internalType: 'int128', name: 'amount', type: 'int128' },
      { internalType: 'uint256', name: 'end', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getNFTLocker(ctx: BalancesContext, locker: Contract): Promise<Balance[] | undefined> {
  const balances: Balance[] = []

  const { output: balanceOfRes } = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  if (!balanceOfRes && isZero(balanceOfRes)) {
    return
  }

  const tokenOfOwnerByIndexesRes = await multicall({
    ctx,
    calls: range(0, balanceOfRes).map((_, idx) => ({ target: locker.address, params: [ctx.address, idx] })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const lockedBalances = await multicall({
    ctx,
    calls: tokenOfOwnerByIndexesRes.map((tokenIdx) =>
      isSuccess(tokenIdx) ? { target: locker.address, params: [tokenIdx.output] } : null,
    ),
    abi: abi.locked,
  })

  for (let idx = 0; idx < lockedBalances.length; idx++) {
    const lockedBalance = lockedBalances[idx]

    if (!isSuccess(lockedBalance)) {
      continue
    }

    const { amount, end } = lockedBalance.output

    balances.push({
      ...locker,
      amount: BigNumber.from(amount),
      lock: { end },
      underlyings: locker.underlyings as Contract[],
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}
