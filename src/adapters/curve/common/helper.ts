import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf, getERC20Details } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

export interface BalanceWithExtraProps extends Balance {
  tokens?: Token[]
  poolAddress?: string
  lpToken?: string
}

export async function getCurveBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[],
  registry: Contract,
): Promise<BalanceWithExtraProps[]> {
  const balances: BalanceWithExtraProps[] = []

  const nonEmptyPools: Contract[] = (await getERC20BalanceOf(ctx, chain, contracts as Token[])).filter((pool) =>
    pool.amount.gt(0),
  )

  for (let i = 0; i < nonEmptyPools.length; i++) {
    const nonEmptyPool = nonEmptyPools[i]

    const [totalSupplyRes, underlyingsBalancesRes] = await Promise.all([
      call({
        chain,
        target: nonEmptyPool.lpToken,
        params: [],
        abi: {
          stateMutability: 'view',
          type: 'function',
          name: 'totalSupply',
          inputs: [],
          outputs: [
            {
              name: '',
              type: 'uint256',
            },
          ],
          gas: 3240,
        },
      }),

      call({
        chain,
        target: registry.address,
        params: [nonEmptyPool.poolAddress],
        abi: {
          stateMutability: 'view',
          type: 'function',
          name: 'get_underlying_balances',
          inputs: [{ name: '_pool', type: 'address' }],
          outputs: [{ name: '', type: 'uint256[8]' }],
        },
      }),
    ])

    const totalSupply = BigNumber.from(totalSupplyRes.output)

    const underlyingsBalances: BigNumber[] = underlyingsBalancesRes.output
      .map((res: string) => BigNumber.from(res))
      .filter((amount: BigNumber) => amount.gt(0))

    const [token, underlyings] = await Promise.all([
      getERC20Details(chain, nonEmptyPool.tokens),
      getERC20Details(chain, nonEmptyPool.underlyings as any),
    ])

    /**
     *  Updating pool amounts from the fraction of each underlyings
     */

    const formattedUnderlyings = underlyings.map((underlying, x) => ({
      ...underlying,
      amount: underlying.decimals && nonEmptyPool.amount.mul(underlyingsBalances[x]).div(totalSupply),
      decimals: underlying.decimals,
    }))

    balances.push({
      chain,
      address: nonEmptyPool.address,
      amount: nonEmptyPool.amount,
      symbol: token.map((coin) => coin.symbol).join('-'),
      tokens: token.map((coin) => coin),
      underlyings: formattedUnderlyings,
      decimals: 18,
    })
  }

  return balances
}
