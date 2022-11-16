import { call } from '@defillama/sdk/build/abi'
import { Chain } from '@lib/chains'
import { BaseContext, Contract, Balance } from '@lib/adapter'
import { BigNumber } from 'ethers'

export async function getRewardsBalances(ctx: BaseContext, chain: Chain, comptroller?: Contract, lens?: Contract) {
  const rewards: Balance[] = []

  if (!comptroller || !lens || !lens.underlyings) {
    console.log('Missing or incorrect inputs contracts')

    return []
  }

  try {
    const XVS = lens.underlyings?.[0]

    const XVSAllocatedRewardsRes = await call({
      chain,
      target: lens.address,
      params: [XVS.address, comptroller.address, ctx.address],
      abi: {
        constant: false,
        inputs: [
          { internalType: 'contract XVS', name: 'xvs', type: 'address' },
          { internalType: 'contract ComptrollerLensInterface', name: 'comptroller', type: 'address' },
          { internalType: 'address', name: 'account', type: 'address' },
        ],
        name: 'getXVSBalanceMetadataExt',
        outputs: [
          {
            components: [
              { internalType: 'uint256', name: 'balance', type: 'uint256' },
              { internalType: 'uint256', name: 'votes', type: 'uint256' },
              { internalType: 'address', name: 'delegate', type: 'address' },
              { internalType: 'uint256', name: 'allocated', type: 'uint256' },
            ],
            internalType: 'struct VenusLens.XVSBalanceMetadataExt',
            name: '',
            type: 'tuple',
          },
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
    })

    const XVSAllocatedRewards = BigNumber.from(XVSAllocatedRewardsRes.output.allocated)    

    rewards.push({
      chain,
      address: XVS.address,
      decimals: XVS.decimals,
      symbol: XVS.symbol,
      amount: XVSAllocatedRewards,
      category: 'reward',
    })

    return rewards
  } catch (error) {
    console.log('Failed to get rewards')

    return []
  }
}
