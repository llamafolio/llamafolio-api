import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'
import { range } from 'lodash'

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
  nftLocked: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'nftLocked',
    outputs: [
      { internalType: 'int256', name: 'amount', type: 'int256' },
      { internalType: 'uint256', name: 'end', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

interface NFTBalance extends Balance {
  nftId: string
}

const IZI: Token = {
  chain: 'ethereum',
  address: '0x9ad37205d608B8b219e6a2573f922094CEc5c200',
  decimals: 18,
  symbol: 'IZI',
}

export async function getLockerIzumiBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const balances: NFTBalance[] = []

  const { output: balanceOfsRes } = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const tokenOfOwnerByIndexesRes = await multicall({
    ctx,
    calls: range(0, balanceOfsRes).map((idx) => ({ target: locker.address, params: [ctx.address, idx] })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const lockedsRes = await multicall({
    ctx,
    calls: tokenOfOwnerByIndexesRes.map((tokenIdx) =>
      isSuccess(tokenIdx) ? { target: locker.address, params: [tokenIdx.output] } : null,
    ),
    abi: abi.nftLocked,
  })

  for (let idx = 0; idx < balanceOfsRes; idx++) {
    const lockedRes = lockedsRes[idx]

    if (!isSuccess(lockedRes)) {
      continue
    }

    balances.push({
      ...locker,
      nftId: lockedRes.input.params[0],
      amount: BigNumber.from(lockedRes.output.amount),
      unlockAt: lockedRes.output.end,
      underlyings: [IZI],
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}
