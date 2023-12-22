import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { getBalancesOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getPricesPerSharesBalances, type PricesPerSharesParams } from '@lib/pricePerShare'

const abi = {
  stakingToken: {
    inputs: [],
    name: 'stakingToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlying: {
    inputs: [],
    name: 'underlying',
    outputs: [{ internalType: 'contract IERC20Upgradeable', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  exchangeRateStored: {
    inputs: [],
    name: 'exchangeRateStored',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getUnitusStakers(ctx: BaseContext, addresses: `0x${string}`[]): Promise<Contract[]> {
  const tokens = await multicall({
    ctx,
    calls: addresses.map((address) => ({ target: address }) as const),
    abi: abi.stakingToken,
  })

  const underlyings = await multicall({
    ctx,
    calls: mapSuccessFilter(tokens, (res) => ({ target: res.output }) as const),
    abi: abi.underlying,
  })

  return mapSuccessFilter(underlyings, (res, index) => ({
    chain: ctx.chain,
    address: addresses[index],
    token: res.input.target,
    underlyings: [res.output],
  }))
}

export async function getUnitusStakersBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const userShares = await getBalancesOf(ctx, stakers, { getAddress: (contract) => contract.address })
  return getPricesPerSharesBalances(ctx, userShares, {
    getPricesPerShares: (params) => getUnitusPricesPerShares({ ctx, contracts: params.contracts }),
    getCategory: () => 'stake',
  })
}

async function getUnitusPricesPerShares({ ctx, contracts }: PricesPerSharesParams): Promise<bigint[]> {
  const pricePerShares = await multicall({
    ctx,
    calls: contracts.map((contract) => ({ target: contract.token! }) as const),
    abi: abi.exchangeRateStored,
  })

  return mapSuccessFilter(pricePerShares, (res) => res.output)
}
