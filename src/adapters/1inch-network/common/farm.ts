import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO, isZero } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber, ethers } from 'ethers'

const abi = {
  earned: {
    inputs: [
      { internalType: 'uint256', name: 'i', type: 'uint256' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getBalanceForAddition: {
    inputs: [
      {
        internalType: 'contract IERC20',
        name: 'token',
        type: 'address',
      },
    ],
    name: 'getBalanceForAddition',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  singleEarned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const Inch: Token = {
  chain: 'ethereum',
  address: '0x111111111117dC0aa78b770fA6A738034120C302',
  decimals: 18,
  symbol: '1INCH',
}

const ADDRESS: { [key: string]: string } = {
  ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  bsc: '0x55f5af28075f37e6e02d0c741e268e462215ca33',
}

export async function getInchBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfsRes, earnedOfsRes, singleRewardEarnedsRes, getUnderlyingsBalancesRes, totalSuppliesRes] =
    await Promise.all([
      multicall({
        ctx,
        calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
        abi: erc20Abi.balanceOf,
      }),
      multicall({
        ctx,
        calls: pools.flatMap((pool) =>
          pool.underlyings!.map((_, idx) => ({ target: pool.address, params: [idx, ctx.address] })),
        ),
        abi: abi.earned,
      }),
      multicall({
        ctx,
        calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
        abi: abi.singleEarned,
      }),
      multicall({
        ctx,
        calls: pools.flatMap((pool) =>
          pool.underlyings!.map((underlying) => ({
            target: pool.lpToken,
            params: [(underlying as Contract).address],
          })),
        ),
        abi: abi.getBalanceForAddition,
      }),
      multicall({
        ctx,
        calls: pools.map((pool) => ({ target: pool.lpToken })),
        abi: erc20Abi.totalSupply,
      }),
    ])

  pools.forEach((pool, poolIdx) => {
    const balanceOfRes = balanceOfsRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const singleRewardEarnedRes = singleRewardEarnedsRes[poolIdx]

    const underlyings = pool.underlyings as Contract[]

    if (!underlyings || !isSuccess(balanceOfRes) || !isSuccess(totalSupplyRes) || isZero(totalSupplyRes.output)) {
      return
    }

    const balance: Balance = {
      ...pool,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings: [],
      rewards: [],
      category: 'farm',
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const getUnderlyingsBalanceRes = getUnderlyingsBalancesRes[underlyingIdx]
      const earnedOfRes = earnedOfsRes[underlyingIdx]

      // replace native token alias
      const underlyingAddress =
        underlying.address === ethers.constants.AddressZero ? ADDRESS[ctx.chain] : underlying.address

      const underlyingBalance = isSuccess(getUnderlyingsBalanceRes)
        ? BigNumber.from(getUnderlyingsBalanceRes.output).mul(balanceOfRes.output).div(totalSupplyRes.output)
        : BN_ZERO

      balance.underlyings!.push({
        ...underlying,
        address: underlyingAddress,
        amount: underlyingBalance,
      })

      if (!isSuccess(earnedOfRes)) {
        return
      }

      // Most pools use INCH + xtoken as rewards which correspond to the same tokens as the underlyings

      balance.rewards!.push({
        ...underlying,
        address: underlyingAddress,
        amount: BigNumber.from(earnedOfRes.output),
      })
    })

    // But some old pools still use an unique reward: INCH

    if (balance.rewards!.length < 1) {
      const singleRewardBalance = isSuccess(singleRewardEarnedRes)
        ? BigNumber.from(singleRewardEarnedRes.output)
        : BN_ZERO

      balance.rewards?.push({
        ...Inch,
        amount: singleRewardBalance,
      })
    }

    balances.push(balance)
  })

  return balances
}
