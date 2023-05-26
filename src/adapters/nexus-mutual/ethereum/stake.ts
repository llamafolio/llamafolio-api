import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const NXM: Token = {
  chain: 'ethereum',
  address: '0xd7c49CEE7E9188cCa6AD8FF264C1DA2e69D4Cf3B',
  decimals: 18,
  symbol: 'NXM',
}

const wNXM: Token = {
  chain: 'ethereum',
  address: '0x0d438f3b5175bebc262bf23753c1e53d03432bde',
  decimals: 18,
  symbol: 'wNXM',
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract) {
  const balances: Balance[] = []

  const [getStakeBalances, getRewardsBalances] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: {
        constant: true,
        inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
        name: 'stakerDeposit',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: {
        constant: true,
        inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
        name: 'stakerReward',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const stakeBalances = BigNumber.from(getStakeBalances)
  const rewardsBalances = BigNumber.from(getRewardsBalances)

  balances.push({
    chain: NXM.chain,
    address: NXM.address,
    decimals: NXM.decimals,
    symbol: NXM.symbol,
    underlyings: [wNXM],
    amount: stakeBalances,
    rewards: [{ ...NXM, amount: rewardsBalances }],
    category: 'stake',
  })

  return balances
}
