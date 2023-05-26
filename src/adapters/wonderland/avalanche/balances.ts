import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  wMEMOToMEMO: {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'wMEMOToMEMO',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    constant: true,
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'address', name: '_rewardsToken', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const TIME: Contract = {
  name: 'Time',
  displayName: 'Time Token',
  chain: 'avalanche',
  address: '0xb54f16fb19478766a268f172c9480f8da1a7c9c3',
  decimals: 9,
  symbol: 'TIME',
}

const wMEMO: Contract = {
  name: 'Wrapped MEMO',
  displayName: 'Wrapped MEMO',
  chain: 'avalanche',
  address: '0x0da67235dd5787d67955420c84ca1cecd4e5bb3b',
  decimals: 18,
  symbol: 'wMEMO ',
}

export async function getTIMEStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const balanceOf = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const formattedBalanceOfRes = await call({
    ctx,
    target: contract.address,
    params: [balanceOf],
    abi: abi.wMEMOToMEMO,
  })

  const formattedBalanceOf = BigNumber.from(formattedBalanceOfRes)

  const balance: Balance = {
    chain: ctx.chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    underlyings: [TIME],
    amount: formattedBalanceOf,
    category: 'stake',
  }

  return balance
}

export async function getwMEMOStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const rewards = contract.rewards

  const balanceOfRes = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const balanceOf = BigNumber.from(balanceOfRes)

  const balance: Balance = {
    chain: ctx.chain,
    address: contract.address,
    symbol: wMEMO.symbol,
    decimals: wMEMO.decimals,
    amount: balanceOf,
    underlyings: [wMEMO],
    rewards: [],
    category: 'stake',
  }

  if (rewards) {
    const calls = rewards.map((token: any) => ({
      target: contract.address,
      params: [ctx.address, token.address],
    }))

    const rewardsBalanceOfRes = await multicall({
      ctx,
      calls,
      abi: abi.earned,
    })

    let rewardsIdx = 0
    for (let balanceIdx = 0; balanceIdx < rewardsBalanceOfRes.length; balanceIdx++) {
      const rewardBalanceOfRes = rewardsBalanceOfRes[balanceIdx]
      const reward = rewards[rewardsIdx]

      if (!isSuccess(rewardBalanceOfRes)) {
        continue
      }

      balance.rewards?.push({ ...(reward as Contract), amount: BigNumber.from(rewardBalanceOfRes.output) })

      rewardsIdx++
    }
  }

  return balance
}
