import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
}

export async function getMarketsContracts(ctx: BaseContext, cauldrons: string[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const calls: Call[] = cauldrons.map((cauldron) => ({ target: cauldron, params: [] }))
  const collateralTokensRes = await multicall({ ctx, calls, abi: abi.collateral })

  const tokenCalls: Call[] = []
  for (let idx = 0; idx < collateralTokensRes.length; idx++) {
    const cauldron = cauldrons[idx]
    const collateralTokenRes = collateralTokensRes[idx]
    if (!isSuccess(collateralTokenRes)) {
      continue
    }

    const contract: Contract = {
      chain: ctx.chain,
      address: cauldron,
      collateralToken: collateralTokenRes.output,
      underlyings: [],
    }

    tokenCalls.push({ target: contract.collateralToken, params: [] })
    contracts.push(contract)
  }

  const underlyingsTokensRes = await multicall({ ctx, calls: tokenCalls, abi: abi.token })

  for (let cauldronIdx = 0; cauldronIdx < contracts.length; cauldronIdx++) {
    const cauldron = contracts[cauldronIdx]
    const underlyingsTokenRes = underlyingsTokensRes[cauldronIdx]

    if (!isSuccess(underlyingsTokenRes)) {
      cauldron.underlyings?.push(cauldron.collateralToken)
      continue
    }
    cauldron.underlyings?.push(underlyingsTokenRes.output)
  }

  return contracts
}

export async function getMarketsBalances(ctx: BalancesContext, markets: Contract[], MIM: Contract) {
  const balances: Balance[] = []

  const calls: Call[] = markets.map((contract) => ({ target: contract.address, params: [ctx.address] }))
  const [lendingBalancesRes, borrowingBalancesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userCollateralShare }),
    multicall({ ctx, calls, abi: abi.userBorrowPart }),
  ])

  for (let marketIdx = 0; marketIdx < markets.length; marketIdx++) {
    const market = markets[marketIdx]
    const lendingBalanceRes = lendingBalancesRes[marketIdx]
    const borrowingBalanceRes = borrowingBalancesRes[marketIdx]
    const underlying = market.underlyings?.[0] as Contract

    if (isSuccess(lendingBalanceRes) && underlying) {
      const balance: Balance = {
        ...market,
        decimals: underlying.decimals,
        symbol: underlying.symbol,
        amount: BigNumber.from(lendingBalanceRes.output),
        underlyings: [{ ...underlying, amount: BigNumber.from(lendingBalanceRes.output) }],
        rewards: undefined,
        category: 'lend',
      }

      balances.push(balance)
    }

    if (isSuccess(borrowingBalanceRes)) {
      const balance: Balance = {
        ...MIM,
        amount: BigNumber.from(borrowingBalanceRes.output),
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      balances.push(balance)
    }
  }

  return balances
}
