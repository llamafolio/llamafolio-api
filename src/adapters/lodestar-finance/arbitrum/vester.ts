import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'
import { BigNumber, utils } from 'ethers'

const abi = {
  underlyingPerDealExchangeRate: {
    inputs: [],
    name: 'underlyingPerDealExchangeRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimableTokens: {
    inputs: [{ internalType: 'address', name: 'purchaser', type: 'address' }],
    name: 'claimableTokens',
    outputs: [
      { internalType: 'uint256', name: 'underlyingClaimable', type: 'uint256' },
      { internalType: 'uint256', name: 'dealTokensClaimable', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  vestingExpiry: {
    inputs: [],
    name: 'vestingExpiry',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const LODE: Token = {
  chain: 'arbitrum',
  address: '0x5ecc0446e8aa72b9bd74b8935687e1e4ca3478d3',
  decimals: 18,
  symbol: 'LODE',
}

export async function getVestBalances(ctx: BalancesContext, vester: Contract): Promise<Balance> {
  const [{ output: balanceOf }, { output: exchangeRate }, { output: claimable }, { output: vestingExpiry }] =
    await Promise.all([
      call({ ctx, target: vester.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
      call({ ctx, target: vester.address, abi: abi.underlyingPerDealExchangeRate }),
      call({ ctx, target: vester.address, params: [ctx.address], abi: abi.claimableTokens }),
      call({ ctx, target: vester.address, abi: abi.vestingExpiry }),
    ])

  const underlyings: Contract[] = [
    { ...LODE, amount: BigNumber.from(balanceOf).mul(exchangeRate).div(utils.parseEther('1.0')) },
  ]

  return {
    ...vester,
    amount: BigNumber.from(balanceOf),
    underlyings,
    claimable: BigNumber.from(claimable.underlyingClaimable),
    unlockAt: vestingExpiry,
    rewards: undefined,
    category: 'vest',
  }
}
