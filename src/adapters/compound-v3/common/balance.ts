import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  borrowBalanceOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'borrowBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userCollateral: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userCollateral',
    outputs: [
      { internalType: 'uint128', name: 'balance', type: 'uint128' },
      { internalType: 'uint128', name: '_reserved', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getRewardOwed: {
    inputs: [
      { internalType: 'address', name: 'comet', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getRewardOwed',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'owed', type: 'uint256' },
        ],
        internalType: 'struct CometRewards.RewardOwed',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
} as const

const COMP: { [key: string]: `0x${string}` } = {
  arbitrum: '0x354A6dA3fcde098F8389cad84b0182725c6C91dE',
  base: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0',
  ethereum: '0xc00e94cb662c3520282e6f5717214004a7f26888',
  polygon: '0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c',
}

export async function getCompLendBalances(
  ctx: BalancesContext,
  assets: Contract[],
  compounders: Contract[],
): Promise<Balance[]> {
  const [userLendBalances, userBorrowBalances] = await Promise.all([
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: asset.compounder, params: [ctx.address, asset.address] }) as const),
      abi: abi.userCollateral,
    }),
    multicall({
      ctx,
      calls: compounders.map((compounder) => ({ target: compounder.address, params: [ctx.address] }) as const),
      abi: abi.borrowBalanceOf,
    }),
  ])

  const supplyBalance: Balance[] = mapSuccessFilter(userLendBalances, (res, index) => {
    const [balance, _reserved] = res.output

    return {
      chain: ctx.chain,
      decimals: assets[index].decimals,
      symbol: assets[index].symbol,
      address: assets[index].address,
      amount: balance,
      collateralFactor: assets[index].collateralFactor,
      category: 'lend',
    }
  })

  const borrowBalance: Balance[] = mapSuccessFilter(userBorrowBalances, (res, index) => {
    const underlying = compounders[index].underlyings?.[0] as Contract

    if (!underlying) {
      return null
    }

    return {
      chain: ctx.chain,
      decimals: underlying.decimals,
      symbol: underlying.symbol,
      address: underlying.address,
      amount: res.output,
      category: 'borrow',
    }
  }).filter(isNotNullish) as Balance[]

  return [...supplyBalance, ...borrowBalance]
}

export async function getCompRewardBalances(
  ctx: BalancesContext,
  rewarder: Contract,
  compounders: Contract[],
): Promise<Balance[]> {
  const pendingCompRewards = await multicall({
    ctx,
    calls: compounders.map(
      (contract) => ({ target: rewarder.address, params: [contract.address, ctx.address] }) as const,
    ),
    abi: abi.getRewardOwed,
  })

  return mapSuccessFilter(pendingCompRewards, (res) => ({
    chain: ctx.chain,
    address: COMP[ctx.chain],
    decimals: 18,
    symbol: 'COMP',
    amount: res.output.owed,
    category: 'reward',
  }))
}
