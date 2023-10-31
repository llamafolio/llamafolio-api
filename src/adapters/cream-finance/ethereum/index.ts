import { getCreamStakeBalances } from '@adapters/cream-finance/ethereum/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'
import { getSingleLockerBalance } from '@lib/lock'
import { multicall } from '@lib/multicall'

const abi = {
  markets: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'markets',
    outputs: [
      { internalType: 'bool', name: 'isListed', type: 'bool' },
      { internalType: 'uint256', name: 'collateralFactorMantissa', type: 'uint256' },
      { internalType: 'enum ComptrollerV1Storage.Version', name: 'version', type: 'uint8' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const CREAM: Contract = {
  chain: 'ethereum',
  address: '0x2ba592F78dB6436527729929AAf6c908497cB200',
  decimals: 18,
  symbol: 'CREAM',
}

const stakers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xe618c25f580684770f2578faca31fb7acb2f5945',
    token: '0x2ba592F78dB6436527729929AAf6c908497cB200',
  },
  {
    chain: 'ethereum',
    address: '0xd5586c1804d2e1795f3fbbafb1fbb9099ee20a6c',
    token: '0x2ba592F78dB6436527729929AAf6c908497cB200',
  },
  {
    chain: 'ethereum',
    address: '0xbdc3372161dfd0361161e06083ee5d52a9ce7595',
    token: '0x2ba592F78dB6436527729929AAf6c908497cB200',
  },
  {
    chain: 'ethereum',
    address: '0x780f75ad0b02afeb6039672e6a6cede7447a8b45',
    token: '0x2ba592F78dB6436527729929AAf6c908497cB200',
  },
]

const locker: Contract = {
  chain: 'ethereum',
  address: '0x3986425b96f11972d31c78ff340908832c5c0043',
}

const comptroller: Contract = {
  chain: 'ethereum',
  address: '0xbdc857eae1d15ad171e11af6fc3e99413ed57ec4',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    comptrollerAddress: comptroller.address,
    underlyingAddressByMarketAddress: {
      // crETH -> ETH
      '0xba2e90b4dcdb235e46b9554360e31f2afa1d8b35': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
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
      comptroller,
      stakers,
      locker,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    stakers: getCreamStakeBalances,
    locker: (...args) => getSingleLockerBalance(...args, CREAM, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}
