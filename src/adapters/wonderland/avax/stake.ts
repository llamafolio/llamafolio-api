import { Balance, Contract } from '@lib/adapter'
import { BalancesContext } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers/lib/ethers'

const abiWonderland = {
  wMEMOToMEMO: {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'wMEMOToMEMO',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokenLength: {
    constant: true,
    inputs: [],
    name: 'rewardTokenLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokens: {
    constant: true,
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewardTokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
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
}

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
    abi: abiWonderland.wMEMOToMEMO,
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

export async function getStakeBalance(
  ctx: BalancesContext,
  chain: Chain,
  contract: Contract,
  wMemoFarm: Contract,
): Promise<Balance> {
  const rewards = contract.rewards

  const balanceOfRes = await call({
    chain,
    block: ctx.blockHeight?.[chain],
    target: wMemoFarm.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const balanceOf = BigNumber.from(balanceOfRes.output)

  const balance: Balance = {
    chain,
    decimals: contract.decimals,
    address: contract.address,
    symbol: contract.symbol,
    amount: balanceOf,
    rewards: [],
    category: 'stake',
  }

  if (rewards) {
    const rewardsBalanceOfRes = await multicall({
      chain,
      block: ctx.blockHeight?.[chain],
      calls: rewards.map((token) => ({
        target: wMemoFarm.address,
        params: [ctx.address, token.address],
      })),
      abi: abiWonderland.earned,
    })

    const rewardsBalanceOf = rewardsBalanceOfRes.filter(isSuccess).map((res) => BigNumber.from(res.output))

    rewards.map((reward, i) =>
      balance.rewards?.push({
        ...reward,
        amount: rewardsBalanceOf[i],
      }),
    )
  }

  return balance
}
