import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getMarketsBalances, getMarketsContracts } from '../common/markets'
import { getMStakeBalance, getMStakeContract } from '../common/mStake'

const mSPELL: Contract = {
  name: 'mSpellStaking',
  chain: 'fantom',
  address: '0xa668762fb20bcd7148Db1bdb402ec06Eb6DAD569',
  decimals: 18,
  symbol: 'mSPELL',
}

const cauldrons = [
  '0x7208d9F9398D7b02C5C22c334c2a7A3A98c0A45d',
  '0x4fdfFa59bf8dda3F4d5b38F260EAb8BFaC6d7bC1',
  '0x8E45Af6743422e488aFAcDad842cE75A09eaEd34',
  '0xd4357d43545F793101b592bACaB89943DC89d11b',
  '0xed745b045f9495B8bfC7b58eeA8E0d0597884e12',
  '0xa3Fc1B4b7f06c2391f7AD7D4795C1cD28A59917e',
]

export const getContracts = async () => {
  const [mStakeContracts, marketsContracts] = await Promise.all([
    getMStakeContract('fantom', mSPELL),
    getMarketsContracts('fantom', cauldrons),
  ])

  return {
    contracts: {
      mStakeContracts,
      marketsContracts,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'fantom', contracts, {
    mStakeContracts: getMStakeBalance,
    marketsContracts: getMarketsBalances,
  })

  return {
    balances,
  }
}
