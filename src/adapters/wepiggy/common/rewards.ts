import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

// multi-chain reward token
const WPC: Token = {
  chain: 'ethereum',
  address: '0x6f620ec89b8479e97a6985792d0c64f237566746',
  decimals: 18,
  symbol: 'WPC',
}

export async function getMarketsRewards(ctx: BaseContext, chain: Chain, piggyDistribution: Contract) {
  const pendingWPCRewardsRes = await call({
    chain,
    target: piggyDistribution.address,
    params: [ctx.address, 'true', 'true'],
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

  // It looks like Debank is using a 1e3 factor
  // Unfortunately Piggy's documentation is in Chinese, so it's complicated to find the mathematical logic
  // At first it seems judicious to render the same as Debank
  const pendingWPCRewards = BigNumber.from(pendingWPCRewardsRes.output).mul(Math.pow(10, 3))

  const reward: Balance = {
    chain,
    address: WPC.address,
    decimals: WPC.decimals,
    symbol: WPC.symbol,
    amount: pendingWPCRewards,
    category: 'reward',
  }

  return reward
}
