import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

export interface GetLendBorrowBalancesParams {
  synthetixContract: Contract
  feePoolAddress: string
  sUSD: Token
}

export async function getLendBorrowBalances(
  ctx: BaseContext,
  chain: Chain,
  { synthetixContract, feePoolAddress, sUSD }: GetLendBorrowBalancesParams,
) {
  const balances: Balance[] = []

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
      target: feePoolAddress,
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

  const lendAmount = BigNumber.from(suppliedRes.output)

  const lendingBalance: Balance = {
    ...(synthetixContract as Balance),
    amount: lendAmount,
    underlyings: [{ ...(synthetixContract.underlyings?.[0] as Balance), amount: lendAmount }],
    category: 'lend',
  }

  balances.push(lendingBalance)

  const borrowAmount = BigNumber.from(borrowedRes.output.alreadyIssued)
  const borrowBalance: Balance = {
    ...sUSD,
    amount: borrowAmount,
    category: 'borrow',
  }
  balances.push(borrowBalance)

  const sUSDRewardAmount = BigNumber.from(feesAvailableRes.output[0])
  const sUSDRewardBalance: Balance = {
    ...sUSD,
    amount: sUSDRewardAmount,
    category: 'reward',
  }
  balances.push(sUSDRewardBalance)

  const SNXRewardAmount = BigNumber.from(feesAvailableRes.output[1])

  const SNXRewardBalance: Balance = {
    ...(synthetixContract as Balance),
    amount: SNXRewardAmount,
    underlyings: [
      {
        ...(synthetixContract.underlyings?.[0] as Balance),
        amount: SNXRewardAmount,
        claimable: SNXRewardAmount,
      },
    ],
    category: 'reward',
  }

  balances.push(SNXRewardBalance)

  return balances
}
