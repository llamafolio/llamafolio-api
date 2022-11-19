import { call } from '@defillama/sdk/build/abi'
import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'

export async function getRewardsBalances(ctx: BaseContext, chain: Chain, comptroller?: Contract, lens?: Contract) {
  const rewards: Balance[] = []

  if (!comptroller || !lens || !lens.underlyings) {
    console.log('Missing or incorrect inputs contracts')

    return []
  }

  try {
    const COMP = lens.underlyings?.[0]

    const compAllocatedRewardsRes = await call({
      chain,
      target: lens.address,
      params: [COMP.address, comptroller.address, ctx.address],
      abi: {
        constant: false,
        inputs: [
          { internalType: 'contract Comp', name: 'comp', type: 'address' },
          {
            internalType: 'contract ComptrollerLensInterface',
            name: 'comptroller',
            type: 'address',
          },
          { internalType: 'address', name: 'account', type: 'address' },
        ],
        name: 'getCompBalanceMetadataExt',
        outputs: [
          {
            components: [
              { internalType: 'uint256', name: 'balance', type: 'uint256' },
              { internalType: 'uint256', name: 'votes', type: 'uint256' },
              { internalType: 'address', name: 'delegate', type: 'address' },
              { internalType: 'uint256', name: 'allocated', type: 'uint256' },
            ],
            internalType: 'struct CompoundLens.CompBalanceMetadataExt',
            name: '',
            type: 'tuple',
          },
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
    })

    const compAllocatedRewards = BigNumber.from(compAllocatedRewardsRes.output.allocated)

    rewards.push({
      chain,
      address: COMP.address,
      decimals: COMP.decimals,
      symbol: COMP.symbol,
      amount: compAllocatedRewards,
      category: 'reward',
    })

    return rewards
  } catch (error) {
    console.log('Failed to get rewards')

    return []
  }
}
