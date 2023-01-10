import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
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

  const collateralsRes = await multicall({
    ctx,
    calls: cauldrons.map((cauldron) => ({
      target: cauldron,
      params: [],
    })),
    abi: abi.collateral,
  })

  const tokensRes = await multicall({
    ctx,
    calls: collateralsRes.map((res) =>
      res.success
        ? {
            target: res.output,
            params: [],
          }
        : null,
    ),
    abi: abi.token,
  })

  for (let cauldronIdx = 0; cauldronIdx < cauldrons.length; cauldronIdx++) {
    const cauldron = cauldrons[cauldronIdx]
    const collateralRes = collateralsRes[cauldronIdx]
    const tokenRes = tokensRes[cauldronIdx]

    if (!isSuccess(tokenRes) || !isSuccess(collateralRes)) {
      continue
    }

    const contract: Contract = {
      chain: ctx.chain,
      address: cauldron,
      underlyings: [tokenRes.output],
    }

    contracts.push(contract)
  }

  return contracts
}

export async function getMarketsBalances(ctx: BalancesContext, markets: Contract[], MIM: Contract) {
  const balances: Balance[] = []

  const [lendingBalancesRes, borrowingBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: markets.map((contract) => ({
        target: contract.address,
        params: [ctx.address],
      })),
      abi: abi.userCollateralShare,
    }),
    multicall({
      ctx,
      calls: markets.map((contract) => ({
        target: contract.address,
        params: [ctx.address],
      })),
      abi: abi.userBorrowPart,
    }),
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
        category: 'lend',
      }

      balances.push(balance)
    }

    if (isSuccess(borrowingBalanceRes)) {
      const balance: Balance = {
        ...MIM,
        amount: BigNumber.from(borrowingBalanceRes.output),
        category: 'borrow',
      }

      balances.push(balance)
    }
  }

  return balances
}
