import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'

const abi = {
  exchangeRate: {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'exchangeRate',
    outputs: [{ internalType: 'uint256', name: 'xr', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  balanceOf: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getWombatLpBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
      abi: abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.provider, params: [(pool.underlyings![0] as Contract).address] })),
      abi: abi.exchangeRate,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlying = pool.underlyings?.[0] as Contract
    const userBalanceRes = userBalancesRes[poolIdx]
    const exchangeRateRes = exchangeRatesRes[poolIdx]

    if (!underlying || !isSuccess(userBalanceRes) || !isSuccess(exchangeRateRes)) {
      continue
    }

    const fmtUnderlying = {
      ...underlying,
      decimals: 18,
      amount: BigNumber.from(userBalanceRes.output).mul(exchangeRateRes.output).div(utils.parseEther('1.0')),
    }

    balances.push({
      ...pool,
      amount: BigNumber.from(userBalanceRes.output),
      underlyings: [fmtUnderlying],
      rewards: undefined,
      category: 'lp',
    })
  }

  return balances
}
