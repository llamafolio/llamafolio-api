import { getUnderlyingsPoolsBalances } from '@adapters/curve-dex/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

type IYearnBalances = Balance & {
  exchangeRate: bigint
  lpToken: `0x${string}`
}

const abi = {
  pricePerShare: {
    stateMutability: 'view',
    type: 'function',
    name: 'pricePerShare',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 43519,
  },
  convertToAssets: {
    stateMutability: 'view',
    type: 'function',
    name: 'convertToAssets',
    inputs: [{ name: '_shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
} as const

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 8,
  symbol: 'WETH',
}

export async function getYearnBalances(
  ctx: BalancesContext,
  vaults: Contract[],
  registry?: Contract,
): Promise<Balance[]> {
  const balances: IYearnBalances[] = []

  const [userBalancesRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address }) as const),
      abi: abi.pricePerShare,
    }),
  ])

  for (const [index, vault] of vaults.entries()) {
    const underlyings = vault.underlyings as Contract[]
    const userBalanceRes = userBalancesRes[index]
    const exchangeRate = exchangeRatesRes[index].success ? exchangeRatesRes[index].output : 1n

    if (!underlyings || !userBalanceRes.success || userBalanceRes.output === 0n || !exchangeRate) continue

    balances.push({
      ...vaults[index],
      lpToken: vaults[index].lpToken,
      amount: userBalanceRes.output,
      underlyings,
      exchangeRate,
      rewards: undefined,
      category: 'farm',
    })
  }

  const fmtCurveBalances = (await getUnderlyingsPoolsBalances(ctx, balances, registry)) as IYearnBalances[]

  let balancesToUse = fmtCurveBalances

  if (ctx.chain === 'optimism' || ctx.chain === 'base') {
    const fmtSwapBalances = (await getUnderlyingBalances(
      ctx,
      fmtCurveBalances.map((balance) => ({ ...balance, address: balance.lpToken })),
    )) as IYearnBalances[]
    balancesToUse = fmtSwapBalances
  }

  adjustUnderlyingAmounts(balancesToUse)
  mergeBalances(balances, balancesToUse)

  return balances
}

function mergeBalances(balances: IYearnBalances[], fmtBalances: IYearnBalances[]) {
  for (let i = 0; i < fmtBalances.length; i++) {
    const contractIndex = balances.findIndex((c) => c.lpToken.toLowerCase() === fmtBalances[i].lpToken.toLowerCase())
    if (contractIndex !== -1) {
      balances[contractIndex] = Object.assign({}, balances[contractIndex], fmtBalances[i])
    }
  }
}

export function adjustUnderlyingAmounts(balances: IYearnBalances[]) {
  for (const balance of balances) {
    if (!balance.underlyings) continue

    balance.category = 'farm'
    balance.underlyings = balance.underlyings.map((underlying: any) => {
      const decimals = balance.chain === 'ethereum' ? underlying.decimals : balance.decimals

      return {
        ...underlying,
        amount: ((underlying.amount || balance.amount) * balance.exchangeRate) / 10n ** BigInt(decimals),
      }
    })
  }
}

export async function getYearnStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalances = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const fmtUserBalances = await call({ ctx, target: staker.address, params: [userBalances], abi: abi.convertToAssets })

  return {
    ...staker,
    amount: fmtUserBalances,
    underlyings: [WETH],
    rewards: undefined,
    category: 'stake',
  }
}
