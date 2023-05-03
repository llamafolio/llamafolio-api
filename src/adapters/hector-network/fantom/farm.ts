import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abi = {
  calWithdrawAndEarned: {
    inputs: [{ internalType: 'address', name: 'wallet', type: 'address' }],
    name: 'calWithdrawAndEarned',
    outputs: [
      {
        internalType: 'uint256',
        name: '_torWithdrawAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_daiWithdrawAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_usdcWithdrawAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_earnedRewardAmount',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getTorAndDaiAndUsdc: {
    inputs: [],
    name: 'getTorAndDaiAndUsdc',
    outputs: [
      { internalType: 'uint256', name: 'torAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'daiAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'usdcAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const Helper: Contract = {
  name: 'TORCurve Helper',
  address: '0x2cFC70B2c114De258F05069c8f8416f6215C4A68',
  chain: 'fantom',
}

const TOR: Contract = {
  name: 'TOR',
  chain: 'fantom',
  address: '0x74e23df9110aa9ea0b6ff2faee01e740ca1c642e',
  decimals: 18,
  symbol: 'TOR',
}

const DAI: Contract = {
  name: 'Dai Stablecoin',
  chain: 'fantom',
  address: '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
  decimals: 18,
  symbol: 'DAI',
}

const USDC: Contract = {
  name: 'USD Coin',
  chain: 'fantom',
  address: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
  decimals: 18,
  symbol: 'USDC',
}

const wFTM: Contract = {
  name: 'Wrapped Fantom',
  chain: 'fantom',
  address: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
  decimals: 18,
  symbol: 'wFTM',
}

const Curve_fiFactoryUSDMetapool: Contract = {
  name: 'Curve.fi Factory USD Metapool: TOR-2pool ',
  address: '0x24699312CB27C26Cfc669459D670559E5E44EE60',
  chain: 'fantom',
  underlyings: [TOR, DAI, USDC],
  rewards: [wFTM],
}

export async function getFarmingBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfRes, shareRes] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: abi.calWithdrawAndEarned,
    }),
    call({
      ctx,
      target: Helper.address,
      params: [],
      abi: abi.getTorAndDaiAndUsdc,
    }),
  ])

  const amount = BigNumber.from(balanceOfRes.output._torWithdrawAmount)
  const rewardsBalanceOf = BigNumber.from(balanceOfRes.output._earnedRewardAmount)

  const TORAmount = BigNumber.from(shareRes.output.torAmount)
  const DAIAmount = BigNumber.from(shareRes.output.daiAmount)
  const USDCAmount = BigNumber.from(shareRes.output.usdcAmount)
  const underlyingAmounts = [TORAmount, DAIAmount, USDCAmount]

  const totalToken = TORAmount.add(DAIAmount).add(USDCAmount)

  const underlyings = Curve_fiFactoryUSDMetapool.underlyings?.map((token, i) => ({
    ...(token as Contract),
    amount: amount.mul(underlyingAmounts[i]).div(totalToken),
  }))

  balances.push({
    address: Curve_fiFactoryUSDMetapool.address,
    chain: ctx.chain,
    amount,
    symbol: `TOR-DAI-USDC`,
    decimals: 18,
    underlyings,
    rewards: [{ ...wFTM, amount: rewardsBalanceOf }],
    category: 'farm',
  })

  return balances
}
