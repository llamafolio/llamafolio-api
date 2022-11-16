import { call } from '@defillama/sdk/build/abi'
import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'

export async function getStakeBalances(ctx: BaseContext, chain: Chain, contract?: Contract) {
  const balances: Balance[] = []

  if (!contract || !contract.underlyings || !contract.rewards) {
    console.log('Missing or incorrect vault contract')

    return []
  }

  try {
    const VAI = contract.underlyings?.[0]
    const XVS = contract.rewards?.[0]

    const [stakeBalanceRes, pendingXVSRes] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: {
          constant: true,
          inputs: [{ internalType: 'address', name: '', type: 'address' }],
          name: 'userInfo',
          outputs: [
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
            { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
          ],
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
          inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
          name: 'pendingXVS',
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
          payable: false,
          stateMutability: 'view',
          type: 'function',
        },
      }),
    ])

    const stakeBalance = BigNumber.from(stakeBalanceRes.output.amount)
    const pendingXVS = BigNumber.from(pendingXVSRes.output)

    balances.push({
      chain,
      address: VAI.address,
      decimals: VAI.decimals,
      symbol: VAI.symbol,
      amount: stakeBalance,
      rewards: [{ ...XVS, amount: pendingXVS }],
      category: 'stake',
    })

    return balances
  } catch (error) {
    console.log('Failed to get stake balance')

    return []
  }
}
