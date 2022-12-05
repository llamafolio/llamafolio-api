import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getGenesisContracts, getYieldBalances } from './genesis'
import { getStakeBalances } from './stake'

const GenesisPools: string[] = [
  '0xf880ceebbbd960143a65ce70366324516f2104fc', // DAI Higher Risk
  '0x26ac1dba97c1f3f33eea9ad8b3e9d9dc588c023e', // DAI Lower Risk
  '0x599c1be6fed6c01db69281f3c36a6c983729a6f4', // USDC Higher Risk
  '0x3f5c39658a54f866db4081b10c4964246abe6b06', // USDC Lower Risk
  '0xcf4cf54f1f9fc1a88c1b4d85d4eee5cdd8ed254b', // USDT Higher Risk
  '0x9b83654edc734ecb9072eb03e70e55813f124c81', // USDT Lower Risk
]

const Spool: Token = {
  chain: 'ethereum',
  address: '0x40803cEA2b2A32BdA1bE61d3604af6a814E70976',
  decimals: 18,
  symbol: 'SPOOL',
}

const spoolStaking: Contract = {
  name: 'Spool Staking Contract',
  chain: 'ethereum',
  address: '0xc3160C5cc63B6116DD182faA8393d3AD9313e213',
  underlyings: [Spool],
  rewards: [Spool],
}

export const getContracts = async () => {
  const genesis = await getGenesisContracts('ethereum', GenesisPools)

  return {
    contracts: { spoolStaking, genesis },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    spoolStaking: getStakeBalances,
    genesis: getYieldBalances,
  })

  return {
    balances,
  }
}
