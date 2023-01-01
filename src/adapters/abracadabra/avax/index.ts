import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getMarketsBalances, getMarketsContracts } from '../common/markets'
import { getMStakeBalance, getMStakeContract } from '../common/mStake'

const mSPELL: Contract = {
  name: 'mSpellStaking',
  chain: 'avax',
  address: '0xBd84472B31d947314fDFa2ea42460A2727F955Af',
  decimals: 18,
  symbol: 'mSPELL',
}

const cauldrons = [
  '0x3CFEd0439aB822530b1fFBd19536d897EF30D2a2',
  '0x3b63f81Ad1fc724E44330b4cf5b5B6e355AD964B',
  '0x95cCe62C3eCD9A33090bBf8a9eAC50b699B54210',
  '0x35fA7A723B3B39f15623Ff1Eb26D8701E7D6bB21',
  '0x0a1e6a80E93e62Bd0D3D3BFcF4c362C40FB1cF3D',
  '0x2450Bf8e625e98e14884355205af6F97E3E68d07',
  '0xAcc6821d0F368b02d223158F8aDA4824dA9f28E3',
]

export const getContracts = async (ctx: BaseContext) => {
  const [mStakeContracts, marketsContracts] = await Promise.all([
    getMStakeContract(ctx, mSPELL),
    getMarketsContracts(ctx, cauldrons),
  ])

  return {
    contracts: { mStakeContracts, marketsContracts },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    mStakeContracts: getMStakeBalance,
    marketsContracts: getMarketsBalances,
  })

  return {
    balances,
  }
}
