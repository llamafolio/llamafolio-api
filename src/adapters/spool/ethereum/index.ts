import { BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getYieldBalances } from './genesis'
import { getStakeBalances } from './stake'

const genesisPools: Contract[] = [
  {
    name: 'Genesis Spool DAI Higher Risk',
    chain: 'ethereum',
    address: '0xf880ceebbbd960143a65ce70366324516f2104fc',
    underlyings: ['0x6b175474e89094c44da98b954eedeac495271d0f'], // DAI
  },
  {
    name: 'Genesis Spool DAI Lower Risk',
    chain: 'ethereum',
    address: '0x26ac1dba97c1f3f33eea9ad8b3e9d9dc588c023e',
    underlyings: ['0x6b175474e89094c44da98b954eedeac495271d0f'], // DAI
  },
  {
    name: 'Genesis Spool USDC Higher Risk',
    chain: 'ethereum',
    address: '0x599c1be6fed6c01db69281f3c36a6c983729a6f4',
    underlyings: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'], // USDC
  },
  {
    name: 'Genesis Spool USDC Lower Risk',
    chain: 'ethereum',
    address: '0x3f5c39658a54f866db4081b10c4964246abe6b06',
    underlyings: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'], // USDC
  },
  {
    name: 'Genesis Spool USDT Higher Risk',
    chain: 'ethereum',
    address: '0xcf4cf54f1f9fc1a88c1b4d85d4eee5cdd8ed254b',
    underlyings: ['0xdac17f958d2ee523a2206206994597c13d831ec7'], // USDT
  },
  {
    name: 'Genesis Spool USDT Lower Risk',
    chain: 'ethereum',
    address: '0x9b83654edc734ecb9072eb03e70e55813f124c81',
    underlyings: ['0xdac17f958d2ee523a2206206994597c13d831ec7'], // USDT
  },
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

export const getContracts = () => {
  return {
    contracts: { spoolStaking, genesisPools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    spoolStaking: getStakeBalances,
    genesisPools: getYieldBalances,
  })

  return {
    balances,
  }
}
