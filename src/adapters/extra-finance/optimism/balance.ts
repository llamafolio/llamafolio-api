import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  getPositionStatus: {
    inputs: [
      {
        internalType: 'uint256[]',
        name: 'reserveIdArr',
        type: 'uint256[]',
      },
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
    ],
    name: 'getPositionStatus',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'reserveId',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'user',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'eTokenStaked',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'eTokenUnStaked',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'liquidity',
            type: 'uint256',
          },
        ],
        internalType: 'struct ILendingPool.PositionStatus[]',
        name: 'statusArr',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const lendingPool: Contract = {
  chain: 'optimism',
  address: '0xbb505c54d71e9e599cb8435b4f0ceec05fc71cbd',
}

export async function getExtraPoolsBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: lendingPool.address, params: [[pool.pid], ctx.address] }) as const),
    abi: abi.getPositionStatus,
  })

  const balances: Balance[] = mapSuccessFilter(userBalancesRes, (res, idx) => {
    const pool = pools[idx]
    const underlying = pool.underlyings?.[0] as Contract
    const [{ eTokenStaked, liquidity }] = res.output

    const balance: Balance = {
      ...pool,
      amount: eTokenStaked,
      underlyings: [{ ...underlying, amount: liquidity }],
      rewards: undefined,
      category: 'farm',
    }

    return balance
  })

  return balances
}
