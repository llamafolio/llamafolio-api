import { getThalesAMMVaultBalances } from '@adapters/thales/common/market'
import { getThalesLPStakerBalance, getThalesStakingBalance, getVeThalesBalance } from '@adapters/thales/common/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const thalesStaking: Contract = {
  chain: 'optimism',
  address: '0xc392133eea695603b51a5d5de73655d571c2ce51',
  token: '0x217d47011b23bb961eb6d93ca9945b7501a5bb11',
  rewards: ['0x217d47011b23bb961eb6d93ca9945b7501a5bb11'],
}

const lPStaking: Contract = {
  chain: 'optimism',
  address: '0x31a20e5b7b1b067705419d57ab4f72e81cc1f6bf',
  token: '0xac6705BC7f6a35eb194bdB89066049D6f1B0B1b5',
  rewards: ['0x217D47011b23BB961eB6D93cA9945B7501a5BB11', '0x4200000000000000000000000000000000000042'],
}

const veThales: Contract = {
  chain: 'optimism',
  address: '0xa25816b9605009aa446d4d597f0aa46fd828f056',
  token: '0x217d47011b23bb961eb6d93ca9945b7501a5bb11',
}

const marketsAddresses: Contract[] = [
  {
    chain: 'optimism',
    address: '0xc10a0a6ff6496e0bd896f9f6da5a7b640b85ea40',
    token: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
  },
  {
    chain: 'optimism',
    address: '0x6c7fd4321183b542e81bcc7de4dfb88f9dbca29f',
    token: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
  },
  {
    chain: 'optimism',
    address: '0x43318de9e8f65b591598f17add87ae7247649c83',
    token: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
  },
  {
    chain: 'optimism',
    address: '0xb484027cb0c538538bad2be492714154f9196f93',
    token: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
  },
]

export const getContracts = async (ctx: BaseContext) => {
  const lPStakings = await getPairsDetails(ctx, [lPStaking], { getAddress: (contract) => contract.token! })

  return {
    contracts: { thalesStaking, lPStakings, veThales, marketsAddresses },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    thalesStaking: getThalesStakingBalance,
    lPStakings: getThalesLPStakerBalance,
    veThales: getVeThalesBalance,
    marketsAddresses: getThalesAMMVaultBalances,
  })

  return {
    groups: [{ balances }],
  }
}
