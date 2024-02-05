import { getUniEthBalance } from '@adapters/bedrock-unieth/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const uniETH: Contract = {
  chain: 'ethereum',
  address: '0xf1376bcef0f78459c0ed0ba5ddce976f1ddf51f4',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
  decimals: 18,
  symbol: 'uniETH ',
}

export const getContracts = async () => {
  return {
    contracts: { uniETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    uniETH: getUniEthBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1676419200,
}
