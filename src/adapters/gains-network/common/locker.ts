import type { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

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
  lockedDeposits: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lockedDeposits',
    outputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'assetsDeposited', type: 'uint256' },
      { internalType: 'uint256', name: 'assetsDiscount', type: 'uint256' },
      { internalType: 'uint256', name: 'atTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'lockDuration', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [{ internalType: 'UFixed18', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'UFixed18', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGainsLockerBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const balances: LockBalance[] = []

  const nftBalanceOf = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const tokenOfOwnerByIndexes = await multicall({
    ctx,
    calls: range(0, Number(nftBalanceOf)).map(
      (index) => ({ target: locker.address, params: [ctx.address, BigInt(index)] } as const),
    ),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokensDepositInfos = await multicall({
    ctx,
    calls: tokenOfOwnerByIndexes.map((tokenIndex) =>
      locker.token && tokenIndex.success
        ? ({ target: locker.token, params: [BigInt(tokenIndex.output)] } as const)
        : null,
    ),
    abi: abi.lockedDeposits,
  })

  const fmtBalances = await multicall({
    ctx,
    calls: tokensDepositInfos.map((token) => {
      if (!token.success || !locker.token) {
        return null
      }
      const [_owner, shares] = token.output

      return { target: locker.token, params: [shares] } as const
    }),
    abi: abi.convertToAssets,
  })

  const now = Math.floor(Date.now() / 1000)

  for (let balanceIdx = 0; balanceIdx < fmtBalances.length; balanceIdx++) {
    const fmtBalance = fmtBalances[balanceIdx]
    const tokensDepositInfo = tokensDepositInfos[balanceIdx]
    const underlying = locker.underlyings?.[0] as Contract

    if (!underlying || !fmtBalance.success || !tokensDepositInfo.success) {
      continue
    }

    const [_owner, _shares, _assetsDeposited, _assetsDiscount, atTimestamp, lockDuration] = tokensDepositInfo.output

    const unlockAt = Number(atTimestamp + lockDuration)

    balances.push({
      ...locker,
      amount: fmtBalance.output,
      claimable: now > unlockAt ? fmtBalance.output : 0n,
      unlockAt,
      underlyings: [underlying],
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}
