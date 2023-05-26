import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  sharesToTokens: {
    inputs: [{ internalType: 'uint256', name: '_shares', type: 'uint256' }],
    name: 'sharesToTokens',
    outputs: [{ internalType: 'uint256', name: 'tokens_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'lastBlockUpdate', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const SDEX: Token = {
  chain: 'ethereum',
  address: '0x5DE8ab7E27f6E7A1fFf3E5B337584Aa43961BEeF',
  decimals: 18,
  symbol: 'SDEX',
}

export async function getSmarDexStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userInfo = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.userInfo,
  })

  const [shares, _lastBlockUpdate] = userInfo

  const sharesToTokens = await call({
    ctx,
    target: staker.address,
    params: [shares],
    abi: abi.sharesToTokens,
  })

  return {
    ...staker,
    amount: BigNumber.from(sharesToTokens),
    underlyings: [SDEX],
    rewards: undefined,
    category: 'stake',
  }
}
