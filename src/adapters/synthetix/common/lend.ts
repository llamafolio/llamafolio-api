import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abi = {
  collateral: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'collateral',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  remainingIssuableSynths: {
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
  feesAvailable: {
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
}

export async function getLendBorrowBalances(
  ctx: BalancesContext,
  synthetixContract: Contract,
  feePoolContract: Contract,
  sUSDContract: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []
  const SNX = synthetixContract.underlyings?.[0]

  const [suppliedRes, borrowedRes, feesAvailableRes] = await Promise.all([
    call({
      ctx,
      target: synthetixContract.address,
      params: [ctx.address],
      abi: abi.collateral,
    }),

    call({
      ctx,
      target: synthetixContract.address,
      params: [ctx.address],
      abi: abi.remainingIssuableSynths,
    }),

    call({
      ctx,
      target: feePoolContract.address,
      params: [ctx.address],
      abi: abi.feesAvailable,
    }),
  ])

  const lendBalances = BigNumber.from(suppliedRes.output)
  const borrowBalances = BigNumber.from(borrowedRes.output.alreadyIssued)
  const sUSDRewardBalances = BigNumber.from(feesAvailableRes.output[0])
  const SNXRewardBalances = BigNumber.from(feesAvailableRes.output[1])

  if (SNX) {
    balances.push({
      chain: ctx.chain,
      address: synthetixContract.address,
      decimals: synthetixContract.decimals,
      symbol: synthetixContract.symbol,
      underlyings: [SNX],
      amount: lendBalances,
      category: 'lend',
    })

    balances.push({
      chain: ctx.chain,
      address: sUSDContract.address,
      decimals: sUSDContract.decimals,
      symbol: sUSDContract.symbol,
      amount: borrowBalances,
      category: 'borrow',
    })

    balances.push({
      chain: ctx.chain,
      address: sUSDContract.address,
      decimals: sUSDContract.decimals,
      symbol: sUSDContract.symbol,
      amount: sUSDRewardBalances,
      category: 'reward',
    })

    balances.push({
      chain: ctx.chain,
      address: SNX.address,
      decimals: SNX.decimals,
      symbol: SNX.symbol,
      amount: SNXRewardBalances,
      category: 'reward',
    })
  }

  return balances
}
