import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { ADDRESS_ZERO } from '@lib/contract'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getActualSupply: {
    inputs: [],
    name: 'getActualSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export type getBalancerPoolsBalancesParams = Balance & {
  totalSupply: BigNumber
  actualSupply?: BigNumber
}

export async function getBalancerPoolsBalances(ctx: BalancesContext, pools: Contract[], vault: Contract) {
  pools = pools.filter((pool) => pool.gauge !== ADDRESS_ZERO)

  const balances: getBalancerPoolsBalancesParams[] = []

  const calls: Call[] = []
  const suppliesCalls: Call[] = []
  const poolTokensBalancesCalls: Call[] = []

  for (const pool of pools) {
    calls.push({ target: pool.gauge, params: [ctx.address] })
    suppliesCalls.push({ target: pool.address, params: [] })
    poolTokensBalancesCalls.push({ target: vault.address, params: [pool.id] })
  }

  const [balanceOfsRes, totalSuppliesRes, actualSuppliesRes, poolTokensBalancesRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: suppliesCalls, abi: erc20Abi.totalSupply }),
    multicall({ ctx, calls: suppliesCalls, abi: abi.getActualSupply }),
    multicall({ ctx, calls: poolTokensBalancesCalls, abi: abi.getPoolTokens }),
  ])

  for (let idx = 0; idx < pools.length; idx++) {
    const pool = pools[idx]
    const underlyings = pool.underlyings as Contract[]
    const balanceOfRes = balanceOfsRes[idx]
    const totalSupplyRes = totalSuppliesRes[idx]
    const actualSupplyRes = actualSuppliesRes[idx]
    const poolTokenBalanceRes = poolTokensBalancesRes[idx]

    if (
      !underlyings ||
      !isSuccess(balanceOfRes) ||
      !isSuccess(totalSupplyRes) ||
      !isSuccess(poolTokenBalanceRes) ||
      isZero(totalSupplyRes.output)
    ) {
      continue
    }

    const balance: getBalancerPoolsBalancesParams = {
      ...pool,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings,
      rewards: undefined,
      totalSupply: BigNumber.from(totalSupplyRes.output),
      // actualSupply is only available for stablepools abi
      actualSupply: actualSupplyRes.output && BigNumber.from(actualSupplyRes.output),
      category: 'farm',
    }

    const detailedUnderlyings: Contract[] = []

    for (let underlyingIdx = 0; underlyingIdx < balance.underlyings!.length; underlyingIdx++) {
      const underlying = balance.underlyings![underlyingIdx]
      const underlyingsBalanceOf = poolTokenBalanceRes.output.balances[underlyingIdx]

      const underlyingAmount = balance.amount
        .mul(underlyingsBalanceOf)
        // actualSupply allows to specify amount of stablePool's underlyings
        .div(balance.actualSupply ? balance.actualSupply : balance.totalSupply)

      balance.underlyings![underlyingIdx] = { ...underlying, amount: underlyingAmount }

      // extra dimension for pools used as underlyings that needs to be unwrapped once more
      const unwrappedUnderlyings = balance.underlyings![underlyingIdx] as Balance

      if (!unwrappedUnderlyings.underlyings) {
        detailedUnderlyings.push(balance.underlyings![underlyingIdx])
        continue
      }

      unwrappedUnderlyings.underlyings = await unwrappedUnderlyingsInPools(ctx, unwrappedUnderlyings, vault)
      detailedUnderlyings.push(...unwrappedUnderlyings.underlyings!)
    }

    /**
     *  TODO: Rewards using rewarder address maybe?
     *  Sometimes underlyings returned in Pool have the lpToken as underlying in order to facilitate the balance function on chain, but in our case it acts as a duplicate.
     *  Unfortunately, we can't remove these underlying before assigning the balance because vault function returns balances in a specific order.
     */

    balance.underlyings = detailedUnderlyings?.filter((underlying) => underlying.address !== balance.address)

    balances.push(balance)
  }

  return balances
}

export async function getLpBalancerPoolsBalances(ctx: BalancesContext, pools: Contract[], vault: Contract) {
  const balances: getBalancerPoolsBalancesParams[] = []

  const balanceOfCalls: Call[] = []
  const suppliesCalls: Call[] = []
  const tokensCalls: Call[] = []

  for (const pool of pools) {
    balanceOfCalls.push({ target: pool.address, params: [ctx.address] })
    suppliesCalls.push({ target: pool.address, params: [] })
    tokensCalls.push({ target: vault.address, params: [pool.id] })
  }

  const [balanceOfsRes, totalSuppliesRes, tokensBalancesRes] = await Promise.all([
    multicall({ ctx, calls: balanceOfCalls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: suppliesCalls, abi: erc20Abi.totalSupply }),
    multicall({ ctx, calls: tokensCalls, abi: abi.getPoolTokens }),
  ])

  for (let idx = 0; idx < pools.length; idx++) {
    const pool = pools[idx]
    const underlyings = pool.underlyings as Contract[]
    const balanceOfRes = balanceOfsRes[idx]
    const totalSupplyRes = totalSuppliesRes[idx]
    const tokensBalanceRes = tokensBalancesRes[idx]

    if (
      !underlyings ||
      !isSuccess(balanceOfRes) ||
      !isSuccess(totalSupplyRes) ||
      !isSuccess(tokensBalanceRes) ||
      isZero(totalSupplyRes.output)
    ) {
      continue
    }

    const balance: getBalancerPoolsBalancesParams = {
      ...pool,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings,
      rewards: undefined,
      totalSupply: BigNumber.from(totalSupplyRes.output),
      category: 'lp',
    }

    const detailedUnderlyings: Contract[] = []

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlying = balance.underlyings![underlyingIdx]
      const underlyingsBalanceOf = tokensBalanceRes.output.balances[underlyingIdx]

      const underlyingAmount = balance.amount.mul(underlyingsBalanceOf).div(balance.totalSupply)

      balance.underlyings![underlyingIdx] = { ...underlying, amount: underlyingAmount }

      // extra dimension for pools used as underlyings that needs to be unwrapped once more
      const unwrappedUnderlyings = balance.underlyings![underlyingIdx] as Balance

      if (!unwrappedUnderlyings.underlyings) {
        detailedUnderlyings.push(balance.underlyings![underlyingIdx])
        continue
      }

      unwrappedUnderlyings.underlyings = await unwrappedUnderlyingsInPools(ctx, unwrappedUnderlyings, vault)
      detailedUnderlyings.push(...unwrappedUnderlyings.underlyings!)
    }

    balance.underlyings = detailedUnderlyings?.filter((underlying) => underlying.address !== balance.address)

    balances.push(balance)
  }

  return balances
}

const unwrappedUnderlyingsInPools = async (ctx: BalancesContext, balance: Contract, vault: Contract) => {
  const unwrappedUnderlyings: Contract[] = []

  const [totalSupplyRes, actualSupplyRes, poolTokensBalancesRes] = await Promise.all([
    call({ ctx, target: balance.address, params: [], abi: erc20Abi.totalSupply }),
    call({ ctx, target: balance.address, params: [], abi: abi.getActualSupply }),
    call({ ctx, target: vault.address, params: [balance.id], abi: abi.getPoolTokens }),
  ])

  if (!balance.underlyings) {
    return
  }

  balance.totalSupply = BigNumber.from(totalSupplyRes.output)
  balance.actualSupply = actualSupplyRes.output && BigNumber.from(actualSupplyRes.output)

  for (let underlyingIdx = 0; underlyingIdx < balance.underlyings.length; underlyingIdx++) {
    const underlying = balance.underlyings[underlyingIdx] as string

    const poolTokenBalanceRes = poolTokensBalancesRes.output.balances[underlyingIdx]

    const underlyingAmount = balance.amount
      .mul(poolTokenBalanceRes)
      .div(balance.actualSupply ? balance.actualSupply : balance.totalSupply)

    if (underlying !== balance.address) {
      unwrappedUnderlyings.push({
        chain: ctx.chain,
        address: underlying,
        amount: underlyingAmount,
      })
    }
  }

  return unwrappedUnderlyings
}
