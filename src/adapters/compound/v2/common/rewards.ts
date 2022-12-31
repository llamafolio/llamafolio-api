import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const COMP: Token = {
  chain: 'ethereum',
  address: '0xc00e94cb662c3520282e6f5717214004a7f26888',
  decimals: 18,
  symbol: 'COMP',
  coingeckoId: 'compound-governance-token',
}

export async function getRewardsBalances(
  ctx: BalancesContext,
  comptroller: Contract,
  lens: Contract,
): Promise<Balance[]> {
  const rewards: Balance[] = []

  const compAllocatedRewardsRes = await call({
    chain: ctx.chain,
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
    chain: ctx.chain,
    address: COMP.address,
    decimals: COMP.decimals,
    symbol: COMP.symbol,
    amount: compAllocatedRewards,
    category: 'reward',
  })

  return rewards
}
