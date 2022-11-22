import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { BigNumber } from 'ethers'

export async function getRewardBalances(
  ctx: BaseContext,
  chain: Chain,
  rewardContract: Contract,
  coreContract: Contract,
): Promise<Balance[]> {
  const rewards: Balance[] = []

  const pendingCompRewardsRes = await call({
    chain,
    target: rewardContract.address,
    params: [coreContract.address, ctx.address],
    abi: {
      inputs: [
        { internalType: 'address', name: 'comet', type: 'address' },
        { internalType: 'address', name: 'account', type: 'address' },
      ],
      name: 'getRewardOwed',
      outputs: [
        {
          components: [
            { internalType: 'address', name: 'token', type: 'address' },
            { internalType: 'uint256', name: 'owed', type: 'uint256' },
          ],
          internalType: 'struct CometRewards.RewardOwed',
          name: '',
          type: 'tuple',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  })

  const pendingCompRewardsToken = pendingCompRewardsRes.output.token
  const pendingCompRewardsBalance = BigNumber.from(pendingCompRewardsRes.output.owed)

  const tokens = await getERC20Details(chain, [pendingCompRewardsToken])
  const token = tokens[0]

  rewards.push({
    chain,
    decimals: token.decimals,
    symbol: token.symbol,
    address: token.address,
    amount: pendingCompRewardsBalance,
    category: 'reward',
  })

  return rewards
}
