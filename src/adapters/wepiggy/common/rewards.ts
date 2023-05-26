import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

// multi-chain reward token
const WPC: Token = {
  chain: 'ethereum',
  address: '0x6f620ec89b8479e97a6985792d0c64f237566746',
  decimals: 18,
  symbol: 'WPC',
}

export async function getMarketsRewards(ctx: BalancesContext, piggyDistribution: Contract): Promise<Balance> {
  const pendingWPCRewardsRes = await call({
    ctx,
    target: piggyDistribution.address,
    params: [ctx.address, true, true],
    abi: {
      inputs: [
        { internalType: 'address', name: 'holder', type: 'address' },
        { internalType: 'bool', name: 'borrowers', type: 'bool' },
        { internalType: 'bool', name: 'suppliers', type: 'bool' },
      ],
      name: 'pendingWpcAccrued',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const pendingWPCRewards = BigNumber.from(pendingWPCRewardsRes).mul(Math.pow(10, 3))

  const reward: Balance = {
    chain: ctx.chain,
    address: WPC.address,
    decimals: WPC.decimals,
    symbol: WPC.symbol,
    amount: pendingWPCRewards,
    category: 'reward',
  }

  return reward
}
