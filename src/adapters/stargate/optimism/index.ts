import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getStakeBalances } from '../common/stake'

const stakingContract: Contract = {
  name: 'lpStaking',
  displayName: 'LP Staking Pool Optimism',
  chain: 'optimism',
  address: '0x4DeA9e918c6289a52cd469cAC652727B7b412Cd2',
}

const OP: Token = {
  chain: 'optimism',
  address: '0x4200000000000000000000000000000000000042',
  decimals: 18,
  symbol: 'OP',
}

const abi = {
  pendingEmissionToken: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingEmissionToken',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export const getContracts = () => {
  return {
    contracts: { stakingContract },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'optimism', contracts, {
    stakingContract: (...args) =>
      getStakeBalances(...args, { rewardToken: OP, pendingRewardAbi: abi.pendingEmissionToken }),
  })

  return {
    balances,
  }
}
