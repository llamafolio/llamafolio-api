import type { BalancesContext, BaseContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getAllPods: {
    inputs: [],
    name: 'getAllPods',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  collateral: {
    inputs: [],
    name: 'collateral',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  podCollateralBalance: {
    inputs: [],
    name: 'podCollateralBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  podDebtBalance: {
    inputs: [],
    name: 'podDebtBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const GHO: Token = {
  chain: 'ethereum',
  address: '0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f',
  decimals: 18,
  symbol: 'GHO',
}

export async function getLendContracts(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const podsAddressesRes = await call({ ctx, target: contract.address, abi: abi.getAllPods })

  const collateralAddressesRes = await multicall({
    ctx,
    calls: podsAddressesRes.map((address) => ({ target: address }) as const),
    abi: abi.collateral,
  })

  return mapSuccessFilter(collateralAddressesRes, (res) => ({
    chain: ctx.chain,
    address: res.input.target,
    token: res.output,
    underlyings: [res.output],
  }))
}

export async function getPaladinPodsBalances(ctx: BalancesContext, contracts: Contract[]) {
  const [userCollateralBalances, userDebtBalances] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address }) as const),
      abi: abi.podCollateralBalance,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address }) as const),
      abi: abi.podDebtBalance,
    }),
  ])

  return mapMultiSuccessFilter(
    userCollateralBalances.map((_, i) => [userCollateralBalances[i], userDebtBalances[i]]),

    (res, index) => {
      const contract = contracts[index]
      const [{ output: userCollateralBalance }, { output: userDebtBalance }] = res.inputOutputPairs

      const lendBalance: LendBalance = {
        ...contract,
        amount: userCollateralBalance,
        underlyings: contract.underlyings as Contract[],
        rewards: undefined,
        category: 'lend',
      }

      const borrowBalance: BorrowBalance = {
        ...GHO,
        amount: userDebtBalance,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return [lendBalance, borrowBalance]
    },
  )
}
