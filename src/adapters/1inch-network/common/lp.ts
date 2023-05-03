import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO, isZero } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber, ethers } from 'ethers'

const abi = {
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
}

const ADDRESS: { [key: string]: string } = {
  ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  bsc: '0x55f5af28075f37e6e02d0c741e268e462215ca33',
}

export async function getLpInchBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfsRes, totalSuppliesRes, getUnderlyingsBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: erc20Abi.totalSupply }),
    multicall({
      ctx,
      calls: pools.flatMap((pool) =>
        pool.underlyings!.map((underlying) => ({
          target: pool.address,
          params: [(underlying as Contract).address],
        })),
      ),
      abi: abi.getBalanceForAddition,
    }),
  ])

  pools.forEach((pool, poolIdx) => {
    const balanceOfRes = balanceOfsRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const underlyings = pool.underlyings as Contract[]

    if (!underlyings || !isSuccess(balanceOfRes) || !isSuccess(totalSupplyRes) || isZero(totalSupplyRes.output)) {
      return
    }

    const balance: Balance = {
      ...pool,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings: [],
      rewards: undefined,
      category: 'lp',
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const getUnderlyingsBalanceRes = getUnderlyingsBalancesRes[underlyingIdx]

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
    })
    balances.push(balance)
  })

  return balances
}
