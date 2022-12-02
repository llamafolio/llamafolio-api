import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { Token } from '@lib/token'
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

export async function getStakeBalances(ctx: BaseContext, chain: Chain, contract: Contract) {
  const balances: Balance[] = []

  const [getStakeBalances, getRewardsBalances] = await Promise.all([
    call({
      chain,
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
      chain,
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

  const stakeBalances = BigNumber.from(getStakeBalances.output)
  const rewardsBalances = BigNumber.from(getRewardsBalances.output)

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
