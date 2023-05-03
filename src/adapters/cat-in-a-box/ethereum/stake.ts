import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  deposited: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'deposited',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  Owing: {
    inputs: [{ internalType: 'address', name: '_depositor', type: 'address' }],
    name: 'Owing',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const boxETH: Token = {
  chain: 'ethereum',
  address: '0x7690202e2C2297bcD03664e31116d1dFfE7e3B73',
  decimals: 18,
  symbol: 'boxETH',
}

const CONVERTER = '0xe4b91faf8810f8895772e7ca065d4cb889120f94'

export async function getCatStakeEscrowBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const { output: userBalancesOfsRes } = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const balance: Balance = {
    ...staker,
    amount: BigNumber.from(userBalancesOfsRes),
    underlyings: [boxETH],
    rewards: undefined,
    category: 'stake',
  }

  return ftmCatBalances(ctx, balance)
}

export async function getCatStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [{ output: deposited }, { output: earned }] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.deposited }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.Owing }),
  ])

  const balance: Balance = {
    ...staker,
    amount: BigNumber.from(deposited),
    underlyings: [boxETH],
    rewards: [{ ...boxETH, amount: BigNumber.from(earned) }],
    category: 'stake',
  }

  return ftmCatBalances(ctx, balance)
}

const ftmCatBalances = async (ctx: BalancesContext, balance: Balance): Promise<Balance> => {
  const { output: ftmBalances } = await call({
    ctx,
    target: CONVERTER,
    params: [balance.amount.toString()],
    abi: abi.convertToAssets,
  })

  return {
    ...balance,
    amount: BigNumber.from(ftmBalances),
  }
}
