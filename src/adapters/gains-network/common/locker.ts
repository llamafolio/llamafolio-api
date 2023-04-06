import { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
}

export async function getGainsLockerBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const balances: LockBalance[] = []

  const { output: nftBalanceOfRes } = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const tokenOfOwnerByIndexes = await multicall({
    ctx,
    calls: range(0, nftBalanceOfRes).map((index) => ({ target: locker.address, params: [ctx.address, index] })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokensDepositInfos = await multicall({
    ctx,
    calls: tokenOfOwnerByIndexes.map((tokenIndex) =>
      isSuccess(tokenIndex) ? { target: locker.token, params: [tokenIndex.output] } : null,
    ),
    abi: abi.lockedDeposits,
  })

  const fmtBalances = await multicall({
    ctx,
    calls: tokensDepositInfos.map((token) =>
      isSuccess(token) ? { target: locker.token, params: [token.output.shares] } : null,
    ),
    abi: abi.convertToAssets,
  })

  const now = Math.floor(Date.now() / 1000)

  for (let balanceIdx = 0; balanceIdx < fmtBalances.length; balanceIdx++) {
    const fmtBalance = fmtBalances[balanceIdx]
    const tokensDepositInfo = tokensDepositInfos[balanceIdx]
    const underlying = locker.underlyings?.[0] as Contract

    if (!underlying || !isSuccess(fmtBalance) || !isSuccess(tokensDepositInfo)) {
      continue
    }

    const unlockAt = parseInt(tokensDepositInfo.output.atTimestamp) + parseInt(tokensDepositInfo.output.lockDuration)

    balances.push({
      ...locker,
      amount: BigNumber.from(fmtBalance.output),
      claimable: now > unlockAt ? BigNumber.from(fmtBalance.output) : BN_ZERO,
      unlockAt,
      underlyings: [underlying],
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}
