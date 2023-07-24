import type { Balance, BalancesContext, Contract, FarmBalance } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { parseEther } from 'viem'

const abi = {
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
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
  earned: {
    inputs: [
      {
        internalType: 'address',
        name: 'rt',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'earned',
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
  getVault: {
    inputs: [],
    name: 'getVault',
    outputs: [{ internalType: 'contract IVault', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolId: {
    inputs: [],
    name: 'getPoolId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
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
} as const

interface TetuBalanceParams extends FarmBalance {
  underlyingsFromUnderlyings?: Contract
  vault?: `0x${string}`
  poolId?: `0x${string}`
  balancerTokens?: Contract[]
}

export async function getTetuVaultBalances(ctx: BalancesContext, vaults: Contract[]): Promise<Balance[]> {
  const balances: TetuBalanceParams[] = []
  const deepUnderlyingsBalances: TetuBalanceParams[] = []

  const [userBalancesRes, exchangeRatesRes, pendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address }) as const),
      abi: abi.getPricePerFullShare,
    }),
    multicall({
      ctx,
      calls: vaults.flatMap((vault) =>
        vault.rewards!.map(
          (reward: any) => ({ target: vault.address, params: [reward.address, ctx.address] }) as const,
        ),
      ),
      abi: abi.earned,
    }),
  ])

  let rewardIdx = 0

  for (let vaultIdx = 0; vaultIdx < vaults.length; vaultIdx++) {
    const vault = vaults[vaultIdx]
    const underlying = vault.underlyingsFromUnderlyings
      ? vault.underlyingsFromUnderlyings[0]
      : (vault.underlyings?.[0] as Contract)
    const rewards = vault.rewards as Balance[]
    const userBalanceRes = userBalancesRes[vaultIdx]
    const exchangeRateRes = exchangeRatesRes[vaultIdx]

    if (!underlying || !userBalanceRes.success || !exchangeRateRes.success) {
      rewardIdx += rewards.length
      continue
    }

    const fmtRewards: Balance[] = rewards
      .map((reward) => {
        const pendingRewardRes = pendingRewardsRes[rewardIdx]

        if (!pendingRewardRes.success) {
          rewardIdx++
          return null
        }

        return { ...reward, amount: pendingRewardRes.output }
      })
      .filter(isNotNullish)

    const balance: TetuBalanceParams = {
      ...vault,
      amount: userBalanceRes.output,
      underlyings: [{ ...underlying, amount: (userBalanceRes.output * exchangeRateRes.output) / parseEther('1.0') }],
      rewards: fmtRewards,
      category: 'farm',
    }

    if (balance.underlyingsFromUnderlyings !== undefined) {
      deepUnderlyingsBalances.push({ ...balance, token: (vault.underlyings?.[0] as Contract).address })
    } else {
      balances.push(balance)
    }
  }

  const underlyingsExchangeRatesRes = await multicall({
    ctx,
    calls: deepUnderlyingsBalances.map((underlying) => ({ target: underlying.token! }) as const),
    abi: abi.getPricePerFullShare,
  })

  const fmtDeepUnderlyingsBalances: TetuBalanceParams[] = mapSuccessFilter(underlyingsExchangeRatesRes, (res, idx) => {
    const balance = deepUnderlyingsBalances[idx]
    const underlying = balance.underlyings?.[0] as Balance

    if (!underlying) {
      return null
    }

    return {
      ...balance,
      underlyings: [{ ...underlying, amount: (underlying.amount * res.output) / parseEther('1.0') }],
    }
  }).filter(isNotNullish)

  return getUnderlyingsBalancer(ctx, [...balances, ...fmtDeepUnderlyingsBalances])
}

const getUnderlyingsBalancer = async (ctx: BalancesContext, pools: TetuBalanceParams[]): Promise<Balance[]> => {
  const stdPools = pools.filter((pool) => pool.poolId === undefined)
  const balancerPools = pools.filter((pool) => pool.poolId !== undefined)

  const [underlyingstokensBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: balancerPools.map((pool) => ({ target: pool.vault!, params: [pool.poolId!] }) as const),
      abi: abi.getPoolTokens,
    }),
    multicall({
      ctx,
      calls: balancerPools.map((pool) => ({ target: pool.underlyings![0].address }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (let poolIdx = 0; poolIdx < balancerPools.length; poolIdx++) {
    const pool = balancerPools[poolIdx]
    const underlyings: any = []
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const underlyingstokensBalanceRes = underlyingstokensBalancesRes[poolIdx]
    const { amount } = pool
    const balancerTokens = pool.balancerTokens as Contract[]

    if (!balancerTokens || !underlyingstokensBalanceRes || !totalSupplyRes.success || totalSupplyRes.output === 0n) {
      continue
    }

    for (let underlyingIdx = 0; underlyingIdx < pool.balancerTokens!.length; underlyingIdx++) {
      const underlying = pool.balancerTokens![underlyingIdx]
      const underlyingsBalances = underlyingstokensBalanceRes.output![1][underlyingIdx]

      if (underlying.address.toLowerCase() === pool.underlyings?.[0].address.toLowerCase() || !underlyingsBalances) {
        continue
      }

      underlyings.push({ ...underlying, amount: (amount * underlyingsBalances) / totalSupplyRes.output })
    }

    pool.underlyings = underlyings
  }
  return [...stdPools, ...balancerPools]
}
