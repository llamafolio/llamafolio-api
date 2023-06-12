import type { BaseContext, Contract, GetBalancesHandler, BalancesContext, Balance } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'
import { multicall } from '@lib/multicall'
import { Categories } from '@lib/category'

const sfrxETHContract: Contract = {
  chain: 'ethereum',
  address: '0x8472a9a7632b173c8cf3a86d3afec50c35548e76',
}

const wstETHContract: Contract = {
  chain: 'ethereum',
  address: '0x100daa78fc509db39ef7d04de0c1abd299f4c6ce',
}

const sfrxETH: Token = {
  chain: 'ethereum',
  address: '0xac3E018457B222d93114458476f3E3416Abbe38F',
  name: 'Staked Frax Ether',
  symbol: 'sfrxETH',
  decimals: 18,
}

const wstETH: Token = {
  chain: 'ethereum',
  address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  name: 'Wrapped liquid staked Ether 2.0',
  symbol: 'wstETH',
  decimals: 18,
}

const crvUsd: Token = {
  chain: 'ethereum',
  address: '0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E',
  name: 'Curve.Fi USD Stablecoin',
  symbol: 'crvUSD',
  decimals: 18,
}

export const getControllerBalance = async (
  ctx: BalancesContext,
  controllerAddr: Contract | Contract[],
): Promise<Balance[]> => {
  const abi = {
    stateMutability: 'view',
    type: 'function',
    name: 'user_state',
    inputs: [
      {
        name: 'user',
        type: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256[4]',
      },
    ],
  } as const

  const returnData = await multicall({
    ctx,
    abi: abi,
    calls: controllerAddr.map((token: Contract) => ({
      target: token.address,
      params: [ctx.address],
    })),
  })
  return returnData
    .map((x) => x.output! as [bigint, bigint, bigint, bigint])
    .map((input, idx) => {
      const [collateral, _, debt] = input
      return [
        {
          token: idx === 0 ? sfrxETH.address : idx === 1 ? wstETH.address : undefined,
          address: idx === 0 ? sfrxETH.address : idx === 1 ? wstETH.address : undefined,
          amount: collateral,
          decimals: idx === 0 ? sfrxETH.decimals : idx === 1 ? wstETH.decimals : undefined,
          chain: 'ethereum',
          symbol: idx === 0 ? sfrxETH.symbol : idx === 1 ? wstETH.symbol : undefined,
          category: Categories.lend.category,
          stable: false,
        },
        {
          token: crvUsd.address,
          address: crvUsd.address,
          amount: debt,
          decimals: 18,
          chain: 'ethereum',
          symbol: 'crvUSD',
          category: Categories.borrow.category,
          stable: true,
        },
      ] as Balance[]
    })
    .flat()
}

export const getContracts = async (ctx: BaseContext) => {
  return {
    contracts: { markets: [sfrxETHContract, wstETHContract] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getControllerBalance,
  })

  return {
    groups: [{ balances }],
  }
}
