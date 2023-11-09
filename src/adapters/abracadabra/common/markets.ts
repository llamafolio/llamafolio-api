import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { parseFloatBI } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  collateral: {
    inputs: [],
    name: 'collateral',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    stateMutability: 'view',
    type: 'function',
    name: 'token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  magicInternetMoney: {
    inputs: [],
    name: 'magicInternetMoney',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  userCollateralShare: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userCollateralShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userBorrowPart: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userBorrowPart',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  COLLATERIZATION: {
    inputs: [],
    name: 'COLLATERIZATION_RATE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMarketsContracts(ctx: BaseContext, cauldrons: `0x${string}`[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const calls: Call<typeof abi.collateral>[] = cauldrons.map((cauldron) => ({ target: cauldron }))
  const collateralTokensRes = await multicall({ ctx, calls, abi: abi.collateral })

  const tokenCalls: Call<typeof abi.token>[] = []
  for (let idx = 0; idx < collateralTokensRes.length; idx++) {
    const cauldron = cauldrons[idx]
    const collateralTokenRes = collateralTokensRes[idx]
    if (!collateralTokenRes.success) {
      continue
    }

    const contract: Contract = {
      chain: ctx.chain,
      address: cauldron,
      collateralToken: collateralTokenRes.output,
      underlyings: [],
    }

    tokenCalls.push({ target: contract.collateralToken })
    contracts.push(contract)
  }

  const underlyingsTokensRes = await multicall({ ctx, calls: tokenCalls, abi: abi.token })

  for (let cauldronIdx = 0; cauldronIdx < contracts.length; cauldronIdx++) {
    const cauldron = contracts[cauldronIdx]
    const underlyingsTokenRes = underlyingsTokensRes[cauldronIdx]

    if (!underlyingsTokenRes.success) {
      cauldron.underlyings?.push(cauldron.collateralToken)
      continue
    }

    ;(cauldron.underlyings as `0x${string}`[])?.push(underlyingsTokenRes.output)
  }

  return contracts
}

export async function getMarketsBalances(ctx: BalancesContext, markets: Contract[], MIM: Contract) {
  const calls: Call<typeof abi.userCollateralShare>[] = markets.map((contract) => ({
    target: contract.address,
    params: [ctx.address],
  }))
  const [lendingBalancesRes, borrowingBalancesRes, LTVs] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userCollateralShare }),
    multicall({ ctx, calls, abi: abi.userBorrowPart }),
    multicall({ ctx, calls: markets.map((market) => ({ target: market.address }) as const), abi: abi.COLLATERIZATION }),
  ])

  return mapMultiSuccessFilter(
    lendingBalancesRes.map((_, i) => [lendingBalancesRes[i], borrowingBalancesRes[i]]),

    (res, index) => {
      const market = markets[index]
      const LTV = LTVs[index]
      const underlying = market.underlyings?.[0] as Contract

      const [{ output: lend }, { output: borrow }] = res.inputOutputPairs

      const lendBalance: Balance = {
        ...market,
        decimals: underlying.decimals,
        symbol: underlying.symbol,
        amount: lend,
        underlyings: [{ ...underlying, amount: lend }],
        rewards: undefined,
        MCR: LTV.success ? 1 / parseFloatBI(LTV.output, 5) : undefined,
        category: 'lend',
      }

      const borrowBalance: Balance = {
        ...MIM,
        amount: borrow,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return { balances: [lendBalance, borrowBalance] }
    },
  )
}
