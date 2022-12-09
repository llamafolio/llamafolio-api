import { Balance, Contract } from '@lib/adapter'
import { BalancesContext } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers/lib/ethers'

const TIME: Contract = {
  name: 'Time',
  displayName: 'Time Token',
  chain: 'avax',
  address: '0xb54f16fb19478766a268f172c9480f8da1a7c9c3',
  decimals: 9,
  symbol: 'TIME',
}

export async function getFormattedStakeBalance(ctx: BalancesContext, chain: Chain, wMEMO: Contract): Promise<Balance> {
  const balanceOfRes = await call({
    chain,
    block: ctx.blockHeight?.[chain],
    target: wMEMO.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const balanceOf = balanceOfRes.output

  const formattedBalanceOfRes = await call({
    chain,
    block: ctx.blockHeight?.[chain],
    target: wMEMO.address,
    params: [balanceOf],
    abi: {
      inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
      name: 'wMEMOToMEMO',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const formattedBalanceOf = BigNumber.from(formattedBalanceOfRes.output)

  const balance: Balance = {
    chain,
    address: wMEMO.address,
    symbol: wMEMO.symbol,
    decimals: 9,
    underlyings: [TIME],
    amount: formattedBalanceOf,
    category: 'stake',
  }

  return balance
}

export async function getStakeBalance(ctx: BalancesContext, chain: Chain, wMemoFarm: Contract): Promise<Balance> {
  const rewards: Balance[] = []

  const [balanceOfRes, rewardTokenLengthRes] = await Promise.all([
    call({
      chain,
      block: ctx.blockHeight?.[chain],
      target: wMemoFarm.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    call({
      chain,
      block: ctx.blockHeight?.[chain],
      target: wMemoFarm.address,
      params: [],
      abi: {
        constant: true,
        inputs: [],
        name: 'rewardTokenLength',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const balanceOf = BigNumber.from(balanceOfRes.output)
  const rewardTokenLength = rewardTokenLengthRes.output

  const rewardTokensRes = await multicall({
    chain,
    block: ctx.blockHeight?.[chain],
    calls: range(0, rewardTokenLength).map((i) => ({
      target: wMemoFarm.address,
      params: [i],
    })),
    abi: {
      constant: true,
      inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      name: 'rewardTokens',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  })

  const rewardTokens = rewardTokensRes.filter((res) => res.success).map((res) => res.output)

  const tokens = await getERC20Details(chain, rewardTokens)

  const rewardsBalanceOfRes = await multicall({
    chain,
    block: ctx.blockHeight?.[chain],
    calls: tokens.map((token) => ({
      target: wMemoFarm.address,
      params: [ctx.address, token.address],
    })),
    abi: {
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
  })

  const rewardsBalanceOf = rewardsBalanceOfRes.filter((res) => res.success).map((res) => BigNumber.from(res.output))

  for (let i = 0; i < tokens.length; i++) {
    const reward = {
      ...tokens[i],
      amount: rewardsBalanceOf[i],
    }
    if (reward.amount.gt(0)) {
      rewards.push(reward)
    }
  }

  const balance: Balance = {
    chain,
    decimals: wMemoFarm.token.decimals,
    address: wMemoFarm.token.address,
    symbol: wMemoFarm.token.symbol,
    amount: balanceOf,
    rewards: [...rewards],
    category: 'stake',
  }

  return balance
}
