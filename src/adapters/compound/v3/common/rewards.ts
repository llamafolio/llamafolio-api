import { call } from '@defillama/sdk/build/abi'
import { Chain } from '@lib/chains'
import { BaseContext, Contract, Balance } from '@lib/adapter'
import { getERC20Details } from '@lib/erc20'
import { BigNumber } from 'ethers'

export async function getRewardBalances(
  ctx: BaseContext,
  chain: Chain,
  rewardContract: Contract,
  coreContract: Contract,
) {
  const rewards: Balance[] = []

  if (!rewardContract || !coreContract) {
    console.log('Missing or inccorect contract')

    return []
  }

  try {
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
  } catch (error) {
    console.log('Failed to get rewards')

    return []
  }
}
