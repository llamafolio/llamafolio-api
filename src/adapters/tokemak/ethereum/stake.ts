import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  getStakes: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getStakes',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'initial', type: 'uint256' },
          { internalType: 'uint256', name: 'withdrawn', type: 'uint256' },
          { internalType: 'uint256', name: 'slashed', type: 'uint256' },
          { internalType: 'uint256', name: 'started', type: 'uint256' },
          { internalType: 'uint256', name: 'scheduleIx', type: 'uint256' },
        ],
        internalType: 'struct IStaking.StakingDetails[]',
        name: 'stakes',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const TOKE: Token = {
  chain: 'ethereum',
  address: '0x2e9d63788249371f1DFC918a52f8d799F4a38C94',
  decimals: 18,
  symbol: 'TOKE',
}

export async function getTokemakStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const { output: balanceOfRes } = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.getStakes,
  })

  return {
    ...staker,
    symbol: TOKE.symbol,
    decimals: TOKE.decimals,
    amount: BigNumber.from(balanceOfRes[0].initial),
    underlyings: [TOKE],
    rewards: undefined,
    category: 'stake',
  }
}
