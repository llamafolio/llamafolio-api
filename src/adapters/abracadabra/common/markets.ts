import { BigNumber } from 'ethers'
import { getERC20Details, getERC20Details2 } from '@lib/erc20'
import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { getPricedBalances } from '@lib/price'

export async function getMarketsContracts(chain: Chain, contracts?: string[]) {
  const marketsContracts: Contract[] = []

  if (!contracts) {
    console.log('Missing or incorrect contracts')

    return []
  }

  try {
    const collateralTokenAddressesRes = await multicall({
      chain,
      calls: contracts.map((contract) => ({
        target: contract,
        params: [],
      })),
      abi: {
        inputs: [],
        name: 'collateral',
        outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    })

    const collateralTokenAddresses = collateralTokenAddressesRes.filter((res) => res.success).map((res) => res.output)

    const underlyingsTokenAddressesRes = await multicall({
      chain,
      calls: collateralTokenAddresses.map((address) => ({
        target: address,
        params: [],
      })),
      abi: {
        stateMutability: 'view',
        type: 'function',
        name: 'token',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
      },
    })

    const [tokens, underlyings] = await Promise.all([
      getERC20Details(chain, collateralTokenAddresses),
      getERC20Details2(
        chain,
        underlyingsTokenAddressesRes.map((res) => res.output),
      ),
    ])

    for (let i = 0; i < contracts.length; i++) {
      const token = tokens[i]
      const underlying = underlyings[i]
      const contract = contracts[i]

      const market: Contract = {
        chain,
        address: contract,
        decimals: token.decimals,
        symbol: token.symbol,
        underlyings: [underlying ? underlying : token],
      }
      marketsContracts.push(market)
    }
    return marketsContracts
  } catch (error) {
    console.log('Failed to get market contract')

    return []
  }
}

export async function getMarketsBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]) {
  const balances: Balance[] = []

  if (!contracts) {
    console.log('Missing or incorrect contract')

    return []
  }

  try {
    const [borrowingTokenRes, lendingBalancesRes, borrowingBalancesRes] = await Promise.all([
      multicall({
        chain,
        calls: contracts.map((contract) => ({
          target: contract.address,
          params: [],
        })),
        abi: {
          inputs: [],
          name: 'magicInternetMoney',
          outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function',
        },
      }),

      multicall({
        chain,
        calls: contracts.map((contract) => ({
          target: contract.address,
          params: [ctx.address],
        })),
        abi: {
          inputs: [{ internalType: 'address', name: '', type: 'address' }],
          name: 'userCollateralShare',
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      }),

      multicall({
        chain,
        calls: contracts.map((contract) => ({
          target: contract.address,
          params: [ctx.address],
        })),
        abi: {
          inputs: [{ internalType: 'address', name: '', type: 'address' }],
          name: 'userBorrowPart',
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      }),
    ])

    const borrowingToken = borrowingTokenRes.filter((res) => res.success).map((res) => res.output)

    const underlyingBorrowingTokens = await getERC20Details(chain, borrowingToken)

    const lendingBalances = lendingBalancesRes.filter((res) => res.success).map((res) => BigNumber.from(res.output))

    for (let i = 0; i < contracts.length; i++) {
      const contract = contracts[i]
      const amount = lendingBalances[i]

      if (!contract.underlyings?.[0]) {
        return []
      }

      const lendingBalance: Balance = {
        chain,
        address: contract.address,
        symbol: contract.symbol,
        decimals: contract.decimals,
        amount,
        underlyings: [{ ...contract.underlyings?.[0], amount }],
        category: 'lend',
      }

      balances.push(lendingBalance)
    }

    const borrowingBalances = borrowingBalancesRes.filter((res) => res.success).map((res) => BigNumber.from(res.output))

    for (let i = 0; i < contracts.length; i++) {
      const amount = borrowingBalances[i]
      const underlyingBorrowingToken = underlyingBorrowingTokens[i]

      if (!underlyingBorrowingTokens) {
        return []
      }

      const borrowingBalance: Balance = {
        chain,
        address: underlyingBorrowingToken.address,
        symbol: underlyingBorrowingToken.symbol,
        decimals: underlyingBorrowingToken.decimals,
        amount,
        category: 'borrow',
      }

      balances.push(borrowingBalance)
    }

    return balances
  } catch (error) {
    console.log('Failed to get market balance')

    return []
  }
}

export async function getHealthFactor(balances: Balance[]) {
  if (!balances) {
    console.log('Missing balance to retrieve health factor')

    return
  }

  const nonZeroBalances = balances.filter((balance) => balance.amount.gt(0))

  const nonZeroSuppliedBalances = nonZeroBalances.filter((supply) => supply.category === 'lend')
  const nonZeroBorrowedBalances = nonZeroBalances.filter((borrow) => borrow.category === 'borrow')

  if (nonZeroSuppliedBalances.length === 0) {
    console.log('Supply balance is required to retrieve health factor')

    return
  }

  if (nonZeroBorrowedBalances.length === 0) {
    return 10
  }

  try {
    const [nonZeroSuppliedBalancesPriced, nonZeroBorrowedBalancesPriced] = await Promise.all([
      await getPricedBalances(nonZeroSuppliedBalances),
      getPricedBalances(nonZeroBorrowedBalances),
    ])

    const totalSuppliedBalancesPriced = nonZeroSuppliedBalancesPriced
      .map((balance: any) => balance.balanceUSD)
      .reduce((previous, current) => previous.balanceUSD + current.balanceUSD)

    const totalBorrowedBalancesPriced = nonZeroBorrowedBalancesPriced
      .map((balance: any) => balance.balanceUSD)
      .reduce((previous, current) => previous + current)

    const healthFactor =
      totalBorrowedBalancesPriced > 0 ? totalSuppliedBalancesPriced / totalBorrowedBalancesPriced : 10

    return healthFactor > 10 ? 10 : healthFactor
  } catch (error) {
    return
  }
}
