import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { BigNumber } from 'ethers'

export async function getStakeBalances(ctx: BaseContext, chain: Chain, contract?: Contract) {
  if (!contract || !contract.underlyings?.[0]) {
    return []
  }

  const balances: Balance[] = []

  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const amount = BigNumber.from(balanceOfRes.output)

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount,
    underlyings: [{ ...contract.underlyings?.[0], amount }],
    category: 'stake',
  }

  balances.push(balance)

  return balances
}

export async function getBondBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]) {
  const calls = contracts.map((contract) => ({
    target: contract.address,
    params: [ctx.address],
  }))

  const [vestingBalanceOfRes, pendingBalanceOfRes] = await Promise.all([
    multicall({
      chain,
      calls,
      abi: {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'bondInfo',
        outputs: [
          { internalType: 'uint256', name: 'payout', type: 'uint256' },
          { internalType: 'uint256', name: 'vesting', type: 'uint256' },
          { internalType: 'uint256', name: 'lastBlock', type: 'uint256' },
          { internalType: 'uint256', name: 'pricePaid', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    multicall({
      chain,
      calls,
      abi: {
        inputs: [{ internalType: 'address', name: '_depositor', type: 'address' }],
        name: 'pendingPayoutFor',
        outputs: [{ internalType: 'uint256', name: 'pendingPayout_', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  return contracts
    .map((contract, i) => {
      if (!contract.underlyings?.[0] || !vestingBalanceOfRes[i].success) {
        return
      }

      const vestingAmount = BigNumber.from(vestingBalanceOfRes[i].output.payout)

      const balance: Balance = {
        chain,
        decimals: 9,
        symbol: contracts[i].symbol,
        address: contracts[i].address,
        amount: vestingAmount,
        underlyings: [
          {
            ...contract.underlyings?.[0],
            amount: vestingAmount,
          },
        ],
        category: 'vest',
      }

      // rewards
      if (pendingBalanceOfRes[i].success && contract.rewards?.[0]) {
        const pendingBalance = BigNumber.from(pendingBalanceOfRes[i].output)

        balance.rewards = [
          {
            ...contract.rewards?.[0],
            amount: pendingBalance,
          },
        ]
      }

      return balance
    })
    .filter(isNotNullish)
}
