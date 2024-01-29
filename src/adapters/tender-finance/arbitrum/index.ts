import { getTenderStakerBalance } from '@adapters/tender-finance/arbitrum/stake'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import { multicall } from '@lib/multicall'

const abi = {
  markets: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'markets',
    outputs: [
      { internalType: 'bool', name: 'isListed', type: 'bool' },
      { internalType: 'uint256', name: 'collateralFactorMantissa', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidationThresholdMantissa', type: 'uint256' },
      { internalType: 'uint256', name: 'collateralFactorMantissaVip', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidationThresholdMantissaVip', type: 'uint256' },
      { internalType: 'bool', name: 'isComped', type: 'bool' },
      { internalType: 'bool', name: 'isPrivate', type: 'bool' },
      { internalType: 'bool', name: 'onlyWhitelistedBorrow', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const comptroller: Contract = {
  chain: 'arbitrum',
  address: '0xeed247Ba513A8D6f78BE9318399f5eD1a4808F8e',
}

const staker: Contract = {
  chain: 'arbitrum',
  address: '0x0597c60bd1230a040953cb1c54d0e854cd522932',
  underlyings: ['0xc47d9753f3b32aa9548a7c3f30b6aec3b2d2798c', '0xff9bd42211f12e2de6599725895f37b4ce654ab2'],
  rewards: ['0xff9bd42211f12e2de6599725895f37b4ce654ab2', '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'],
  extraRewarder: '0x6c6f25c37db5620389e02b78ef4664874b69539c',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // tETH -> ETH
      '0x0706905b2b21574defcf00b5fc48068995fcdcdf': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    },
    getMarketsInfos: (ctx, { markets, comptroller }) =>
      multicall({
        ctx,
        calls: markets.map((address) => ({ target: comptroller, params: [address] }) as const),
        abi: abi.markets,
      }),
  })

  return {
    contracts: {
      markets,
      staker,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    staker: getTenderStakerBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1670803200,
}
