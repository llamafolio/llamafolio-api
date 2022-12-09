import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'

export async function getLendBorrowBalances(
  ctx: BalancesContext,
  chain: Chain,
  synthetixContract: Contract,
  feePoolContract: Contract,
  sUSDContract: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []
  const SNX = synthetixContract.underlyings?.[0]

  const [suppliedRes, borrowedRes, feesAvailableRes] = await Promise.all([
    call({
      chain,
      target: synthetixContract.address,
      params: [ctx.address],
      abi: {
        constant: true,
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'collateral',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: synthetixContract.address,
      params: [ctx.address],
      abi: {
        constant: true,
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'remainingIssuableSynths',
        outputs: [
          { internalType: 'uint256', name: 'maxIssuable', type: 'uint256' },
          { internalType: 'uint256', name: 'alreadyIssued', type: 'uint256' },
          {
            internalType: 'uint256',
            name: 'totalSystemDebt',
            type: 'uint256',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: feePoolContract.address,
      params: [ctx.address],
      abi: {
        constant: true,
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'feesAvailable',
        outputs: [
          { internalType: 'uint256', name: '', type: 'uint256' },
          { internalType: 'uint256', name: '', type: 'uint256' },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const lendBalances = BigNumber.from(suppliedRes.output)
  const borrowBalances = BigNumber.from(borrowedRes.output.alreadyIssued)
  const sUSDRewardBalances = BigNumber.from(feesAvailableRes.output[0])
  const SNXRewardBalances = BigNumber.from(feesAvailableRes.output[1])

  if (SNX) {
    balances.push({
      chain,
      address: synthetixContract.address,
      decimals: synthetixContract.decimals,
      symbol: synthetixContract.symbol,
      underlyings: [SNX],
      amount: lendBalances,
      category: 'lend',
    })

    balances.push({
      chain,
      address: sUSDContract.address,
      decimals: sUSDContract.decimals,
      symbol: sUSDContract.symbol,
      amount: borrowBalances,
      category: 'borrow',
    })

    balances.push({
      chain,
      address: sUSDContract.address,
      decimals: sUSDContract.decimals,
      symbol: sUSDContract.symbol,
      amount: sUSDRewardBalances,
      category: 'reward',
    })

    balances.push({
      chain,
      address: SNX.address,
      decimals: SNX.decimals,
      symbol: SNX.symbol,
      amount: SNXRewardBalances,
      category: 'reward',
    })
  }

  return balances
}
