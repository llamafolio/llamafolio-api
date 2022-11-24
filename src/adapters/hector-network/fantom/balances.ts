import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { BigNumber } from 'ethers'

const Helper: Contract = {
  name: 'TORCurve Helper',
  address: '0x2cFC70B2c114De258F05069c8f8416f6215C4A68',
  chain: 'fantom',
}

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

  const balanceOf = balanceOfRes.output

  const formattedBalanceOfRes = await call({
    chain,
    target: contract.address,
    params: [balanceOf],
    abi: {
      inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
      name: 'wsHECTosHEC',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const amount = BigNumber.from(formattedBalanceOfRes.output)

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: contract.decimals,
    amount,
    underlyings: [{ ...contract.underlyings?.[0], amount }],
    category: 'stake',
  }

  balances.push(balance)
  return balances
}

export async function getFarmingBalances(ctx: BaseContext, chain: Chain, contract?: Contract) {
  if (!contract || !contract.underlyings?.[0]) {
    return []
  }

  const curveContract: Contract = contract.underlyings?.[0]

  if (!curveContract.underlyings || !curveContract.rewards?.[0]) {
    return []
  }

  const balances: Balance[] = []

  const [balanceOfRes, shareRes] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: {
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
    }),

    call({
      chain,
      target: Helper.address,
      params: [],
      abi: {
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
    }),
  ])

  const amount = BigNumber.from(balanceOfRes.output._torWithdrawAmount)
  const rewardsBalanceOf = BigNumber.from(balanceOfRes.output._earnedRewardAmount)

  const TORAmount = BigNumber.from(shareRes.output.torAmount)
  const DAIAmount = BigNumber.from(shareRes.output.daiAmount)
  const USDCAmount = BigNumber.from(shareRes.output.usdcAmount)
  const underlyingAmounts = [TORAmount, DAIAmount, USDCAmount]

  const totalToken = TORAmount.add(DAIAmount).add(USDCAmount)

  const underlyings = curveContract.underlyings?.map((token, i) => ({
    ...token,
    amount: amount.mul(underlyingAmounts[i]).div(totalToken),
  }))

  const balance: Balance = {
    address: curveContract.address,
    chain,
    amount,
    symbol: `TOR-DAI-USDC`,
    decimals: 18,
    underlyings,
    rewards: [{ ...curveContract.rewards[0], amount: rewardsBalanceOf }],
    category: 'farm',
  }

  balances.push(balance)
  return balances
}
