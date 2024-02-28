import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  vaultCollateral: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'vaultCollateral',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  vaultDebt: {
    inputs: [{ internalType: 'uint256', name: 'vaultID', type: 'uint256' }],
    name: 'vaultDebt',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  checkCollateralPercentage: {
    inputs: [{ internalType: 'uint256', name: 'vaultID', type: 'uint256' }],
    name: 'checkCollateralPercentage',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getQidaoVaultsBalances(ctx: BalancesContext, vaults: Contract[]): Promise<Balance[]> {
  const userVaultsLengths = await multicall({
    ctx,
    calls: vaults.map((vault) => ({ target: vault.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const tokenOfOwnerByIndexes = await multicall({
    ctx,
    calls: mapSuccessFilter(userVaultsLengths, (res) =>
      rangeBI(0n, res.output).map((i) => ({ target: res.input.target, params: [ctx.address, i] }) as const),
    ).flat(),
    abi: abi.tokenOfOwnerByIndex,
  })

  const [colls, debts, checkHealths] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(
        tokenOfOwnerByIndexes,
        (res) => ({ target: res.input.target, params: [res.output] }) as const,
      ),
      abi: abi.vaultCollateral,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(
        tokenOfOwnerByIndexes,
        (res) => ({ target: res.input.target, params: [res.output] }) as const,
      ),
      abi: abi.vaultDebt,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(
        tokenOfOwnerByIndexes,
        (res) => ({ target: res.input.target, params: [res.output] }) as const,
      ),
      abi: abi.checkCollateralPercentage,
    }),
  ])

  return mapMultiSuccessFilter(
    colls.map((_, i) => [colls[i], debts[i], checkHealths[i]]),

    (res) => {
      const [coll, { output: debt }, { output: health }] = res.inputOutputPairs
      const { input, output } = coll

      const balances = vaults.reduce((acc, vault) => {
        if (vault.address.toLowerCase() === input.target.toLowerCase()) {
          const [collateralToken, debtToken] = vault.underlyings

          const lendBalance: Balance = {
            ...collateralToken,
            amount: output,
            underlyings: undefined,
            rewards: undefined,
            category: 'lend',
          }

          const debtBalance: Balance = {
            ...debtToken,
            amount: debt,
            underlyings: undefined,
            rewards: undefined,
            category: 'borrow',
          }

          acc.push(lendBalance, debtBalance)
        }
        return acc
      }, [])

      return { balances, healthFactor: parseFloatBI(health, 2) }
    },
  )
}

export async function getQidaoYieldsBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [shareBalances, totalSupplies, tokenBalances] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: erc20Abi.totalSupply } as const),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.token!, params: [pool.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
  ])

  return mapMultiSuccessFilter(
    shareBalances.map((_, i) => [shareBalances[i], totalSupplies[i], tokenBalances[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlying = pool.underlyings![0] as Contract
      const [{ output: share }, { output: supply }, { output: tokenBalance }] = res.inputOutputPairs

      if (!underlying || supply === 0n) return null

      const underlyings = [{ ...underlying, amount: (share * tokenBalance) / supply }]

      return {
        ...pool,
        amount: share,
        underlyings,
        rewards: undefined,
        category: 'farm',
      }
    },
  ).filter(isNotNullish)
}
