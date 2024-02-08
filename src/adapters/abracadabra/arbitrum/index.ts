import { getAbracadabraFarmBalances, getAbracadabraFarmContracts } from '@adapters/abracadabra/common/farm'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getMarketsBalances, getMarketsContracts } from '../common/markets'
import { getMStakeBalance, getMStakeContract } from '../common/mStake'

const mSPELL: Contract = {
  name: 'mSpellStaking',
  chain: 'arbitrum',
  address: '0x1df188958a8674b5177f77667b8d173c3cdd9e51',
  decimals: 18,
  symbol: 'mSPELL',
}

const MIM: Contract = {
  name: 'Magic Internet Money',
  address: '0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a',
  chain: 'arbitrum',
  symbol: 'MIM',
  decimals: 18,
  coingeckoId: 'magic-internet-money',
  stable: true,
  wallet: true,
}

const cauldrons: `0x${string}`[] = [
  //  v2
  '0xC89958B03A55B5de2221aCB25B58B89A000215E6', // WETH
  '0x5698135CA439f21a57bDdbe8b582C62f090406D5', // GLP Self-Repaying
  '0x726413d7402fF180609d0EBc79506df8633701B1', // magic GLP
  '0x7962acfcfc2ccebc810045391d60040f635404fb',
  '0x2b02bbeab8ecab792d3f4dda7a76f63aa21934fa',
  '0xd7659d913430945600dfe875434b6d80646d552a',
  '0xc89958b03a55b5de2221acb25b58b89a000215e6',
  '0x4f9737e994da9811b8830775fd73e2f1c8e40741',
  '0x66805f6e719d7e67d46e8b2501c1237980996c6a',
  '0x5698135ca439f21a57bddbe8b582c62f090406d5',
  '0x0352cb4ef3061e7656846cb3f5edbe3124274b9e',
  '0x7fb753f85cd4b6a48553c0fc7bff4d5645ab86a8',
  '0x0fc68d1d3a740126f46512b4b07cd210e1ac748c',
  '0x780db9770ddc236fd659a39430a8a7cc07d0c320',
  '0x7be4b2fc4c6e6423560771dde4f6d114b930bd31',
]

const farmAddresses: `0x${string}`[] = ['0x6d2070b13929df15b13d96cfc509c574168988cd']

export const getContracts = async (ctx: BaseContext) => {
  const [mStakeContracts, marketsContracts, pools] = await Promise.all([
    getMStakeContract(ctx, mSPELL),
    getMarketsContracts(ctx, cauldrons),
    getAbracadabraFarmContracts(ctx, farmAddresses),
  ])

  return {
    contracts: { mStakeContracts, marketsContracts, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getMarketsBalances(ctx, contracts.marketsContracts || [], MIM),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      mStakeContracts: getMStakeBalance,
      pools: getAbracadabraFarmBalances,
    }),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}
