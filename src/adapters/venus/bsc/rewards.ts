import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const XVS: Token = {
  chain: 'bsc',
  address: '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63',
  decimals: 18,
  symbol: 'XVS',
}

export async function getRewardsBalances(
  ctx: BalancesContext,
  chain: Chain,
  comptroller: Contract,
  lens: Contract,
): Promise<Balance[]> {
  const rewards: Balance[] = []

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
}
