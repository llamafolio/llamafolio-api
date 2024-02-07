import { getStakeBalance } from '@adapters/ankr/common/balance'
import { getAnkrETHStakeBalance, getAnkrETHv2StakeBalance, getAnkrStakeBalance } from '@adapters/ankr/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const ankrStaker: Contract = {
  chain: 'ethereum',
  address: '0xab15b0bddc012092cb23f53953149a7f8c1f9e7f',
  token: '0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4',
  underlyings: ['0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4'],
  rewards: ['0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4'],
}

const ankrETHv2: Contract = {
  chain: 'ethereum',
  address: '0xe95a203b1a91a908f9b9ce46459d101078c2c3cb',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const ankrETH: Contract = {
  chain: 'ethereum',
  decimals: 18,
  address: '0x84db6ee82b7cf3b47e8f19270abde5718b936670',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const ankrMATIC: Contract = {
  chain: 'ethereum',
  address: '0x26dcfbfa8bc267b250432c01c982eaf81cc5480c',
  underlyings: ['0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0'],
}

export const getContracts = () => {
  return {
    contracts: { ankrStaker, ankrETHv2, ankrETH, ankrMATIC },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    ankrStaker: getAnkrStakeBalance,
    ankrETHv2: getAnkrETHv2StakeBalance,
    ankrETH: getAnkrETHStakeBalance,
    ankrMATIC: getStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1605913200,
}
