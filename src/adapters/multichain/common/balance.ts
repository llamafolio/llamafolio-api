import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'
import { range } from 'lodash'

const abi = {
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
  totalNFTSupply: {
    inputs: [],
    name: 'totalNFTSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

type MultiBalancesParams = Balance & {
  nft: string
}

export async function getMultiBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const balances: MultiBalancesParams[] = []

  const [{ output: balancesOfsRes }, { output: totalNFTSuppliesRes }] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: abi.totalNFTSupply }),
  ])

  if (!isZero(balancesOfsRes)) {
    const tokenOfOwnerByIndexes = await multicall({
      ctx,
      calls: range(0, totalNFTSuppliesRes).map((idx) => ({ target: staker.address, params: [ctx.address, idx] })),
      abi: abi.tokenOfOwnerByIndex,
    })

    const locked = await multicall({
      ctx,
      calls: tokenOfOwnerByIndexes.map((token) =>
        isSuccess(token) && !isZero(token.output) ? { target: staker.address, params: [token.output] } : null,
      ),
      abi: abi.locked,
    })

    for (let lockedIdx = 0; lockedIdx < locked.length; lockedIdx++) {
      const lock = locked[lockedIdx]
      const underlying = staker.underlyings?.[0] as Contract

      if (!isSuccess(lock)) {
        continue
      }

      balances.push({
        ...staker,
        amount: BigNumber.from(lock.output.amount),
        nft: lock.input.params[0],
        unlockAt: lock.output.end,
        underlyings: [underlying],
        rewards: undefined,
        category: 'lock',
      })
    }
  }

  return balances
}
