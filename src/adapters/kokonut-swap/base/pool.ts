import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  getRegisteredPools: {
    inputs: [],
    name: 'getRegisteredPools',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'addr', type: 'address' },
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'string', name: 'symbol', type: 'string' },
          { internalType: 'address', name: 'lpTokenAddress', type: 'address' },
          { internalType: 'uint256', name: 'lpTokenVirtualPrice', type: 'uint256' },
          { internalType: 'uint256', name: 'lpTokenTotalSupply', type: 'uint256' },
          { internalType: 'uint256', name: 'adminFee', type: 'uint256' },
          {
            components: [
              { internalType: 'address', name: 'addr', type: 'address' },
              { internalType: 'string', name: 'name', type: 'string' },
              { internalType: 'string', name: 'symbol', type: 'string' },
              { internalType: 'uint8', name: 'decimals', type: 'uint8' },
              { internalType: 'uint256', name: 'balance', type: 'uint256' },
              { internalType: 'uint256', name: 'nativeBalance', type: 'uint256' },
              { internalType: 'uint256', name: 'allowance', type: 'uint256' },
              { internalType: 'bool', name: 'isLpToken', type: 'bool' },
            ],
            internalType: 'struct PoolViewer.TokenDto[]',
            name: 'liquidity',
            type: 'tuple[]',
          },
          { internalType: 'uint256', name: 'xcpProfit', type: 'uint256' },
          { internalType: 'uint256', name: 'priceScale', type: 'uint256' },
          { internalType: 'uint256', name: 'priceOracle', type: 'uint256' },
        ],
        internalType: 'struct PoolViewer.PoolInfo[]',
        name: '_poolInfos',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getAllTokens: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getAllTokens',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'addr', type: 'address' },
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'string', name: 'symbol', type: 'string' },
          { internalType: 'uint8', name: 'decimals', type: 'uint8' },
          { internalType: 'uint256', name: 'balance', type: 'uint256' },
          { internalType: 'uint256', name: 'nativeBalance', type: 'uint256' },
          { internalType: 'uint256', name: 'allowance', type: 'uint256' },
          { internalType: 'bool', name: 'isLpToken', type: 'bool' },
        ],
        internalType: 'struct PoolViewer.TokenDto[]',
        name: 'ret',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getKokonutPools(ctx: BaseContext, factory: Contract): Promise<Contract[]> {
  const poolsInfos = await call({ ctx, target: factory.address, abi: abi.getRegisteredPools })

  return poolsInfos.map((poolsInfo) => {
    const { addr, symbol, lpTokenAddress, liquidity } = poolsInfo
    const [token0, token1] = liquidity

    return {
      chain: ctx.chain,
      address: addr,
      decimals: 18,
      symbol,
      token: lpTokenAddress,
      underlyings: [token0.addr, token1.addr],
    }
  })
}

export async function getKokonutBalances(
  ctx: BalancesContext,
  pools: Contract[],
  factory: Contract,
): Promise<Balance[]> {
  const [userBalances, poolInfos] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.token!, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    call({ ctx, target: factory.address, abi: abi.getRegisteredPools }),
  ])

  return mapSuccessFilter(userBalances, (res, index) => {
    const pool = pools[index]
    const poolInfo = poolInfos[index]
    const rawUnderlyings = pool.underlyings as Contract[]
    const { lpTokenTotalSupply, liquidity } = poolInfo

    if (!rawUnderlyings) return null

    const underlyings = rawUnderlyings.map((underlying, idx) => {
      const balance = liquidity[idx].balance

      return { ...underlying, amount: (balance * res.output) / lpTokenTotalSupply }
    })

    return {
      ...pool,
      amount: res.output,
      underlyings,
      rewards: undefined,
      category: 'lp',
    }
  })
}
