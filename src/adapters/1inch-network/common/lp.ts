import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { ADDRESS_ZERO } from '@lib/contract'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

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
} as const

const ADDRESS: { [key: string]: `0x${string}` } = {
  ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  bsc: '0x55f5af28075f37e6e02d0c741e268e462215ca33',
}

export async function getLpInchBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfsRes, totalSuppliesRes, getUnderlyingsBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: erc20Abi.totalSupply }),
    multicall({
      ctx,
      calls: pools.flatMap((pool) =>
        pool.underlyings!.map(
          (underlying) => ({ target: pool.address, params: [(underlying as Contract).address] }) as const,
        ),
      ),
      abi: abi.getBalanceForAddition,
    }),
  ])

  pools.forEach((pool, poolIdx) => {
    const balanceOfRes = balanceOfsRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const underlyings = pool.underlyings as Contract[]

    if (!underlyings || !balanceOfRes.success || !totalSupplyRes.success || totalSupplyRes.output === 0n) {
      return
    }

    const balance: Balance = {
      ...pool,
      amount: balanceOfRes.output,
      underlyings: [],
      rewards: undefined,
      category: 'lp',
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const getUnderlyingsBalanceRes = getUnderlyingsBalancesRes[underlyingIdx]

      // replace native token alias
      const underlyingAddress = underlying.address === ADDRESS_ZERO ? ADDRESS[ctx.chain] : underlying.address

      const underlyingBalance =
        getUnderlyingsBalanceRes.success && balanceOfRes.success && totalSupplyRes.success
          ? (getUnderlyingsBalanceRes.output * balanceOfRes.output) / totalSupplyRes.output
          : 0n

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
