import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  users: {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'users',
    outputs: [
      {
        internalType: 'uint256',
        name: 'assetBalance',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'balance',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'payouts',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'last_time',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const TRUNK: Token = {
  chain: 'bsc',
  address: '0xdd325c38b12903b727d16961e61333f4871a70e0',
  decimals: 18,
  symbol: 'TRUNK',
}

export async function getElephantFarmBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance[] | undefined> {
  const tokens = farmer.underlyings as Contract[]
  if (!tokens) {
    return
  }

  const userBalancesRes = await multicall({
    ctx,
    calls: tokens.map((token) => ({ target: farmer.address, params: [token.address, ctx.address] } as const)),
    abi: abi.users,
  })

  const balances: Balance[] = mapSuccessFilter(userBalancesRes, (res, idx) => {
    const [assetBalance, balance, _payouts, _last_time] = res.output

    return {
      ...tokens[idx],
      amount: assetBalance,
      underlyings: undefined,
      rewards: [{ ...TRUNK, amount: balance }],
      category: 'farm',
    }
  })

  return balances
}
