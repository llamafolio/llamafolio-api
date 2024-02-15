import { getRhinoLpBalances } from '@adapters/rhino.fi/ethereum/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'
import { getPairsContracts } from '@lib/uniswap/v2/factory'

const xDVF: Contract = {
  chain: 'ethereum',
  address: '0xdddd0e38d30dd29c683033fa0132f868597763ab',
  token: '0xDDdddd4301A082e62E84e43F474f044423921918',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x1264f802364e0776b9a9e3d161b43c7333ac08b2',
    offset,
    limit,
  })

  return {
    contracts: { pairs, xDVF },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    xDVF: getSingleStakeBalance,
    pairs: getRhinoLpBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1605308400,
}
