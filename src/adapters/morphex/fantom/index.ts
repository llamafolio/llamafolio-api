import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import {
  getMorphexMLPBalances,
  getMorphexStakeMLPBalances,
  getMorphexStakeMPXBalances,
  getMorphexYieldBalances,
} from './balance'
import { getMorphexContract } from './contract'

const vMLP: Contract = {
  chain: 'fantom',
  address: '0xdba3a9993833595eabd2cde1c235904ad0fd0b86',
  underlyings: ['0xe0f606e6730be531eeaf42348de43c2feed43505', '0x49a97680938b4f1f73816d1b70c3ab801fad124b'],
  rewards: ['0x66eed5ff1701e6ed8470dc391f05e27b1d0657eb'],
}

const fMLP: Contract = {
  chain: 'fantom',
  address: '0xd3c5ded5f1207c80473d39230e5b0ed11b39f905',
  decimals: 18,
  symbol: 'fMLP',
  rewards: ['0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83', '0xe0f606e6730be531eeaf42348de43c2feed43505'],
  rewarder: '0x49a97680938b4f1f73816d1b70c3ab801fad124b',
}

const vMPX: Contract = {
  chain: 'fantom',
  address: '0x8753a83c928939f86341251d7dfad8cf5471410c',
  underlyings: ['0xe0f606e6730be531eeaf42348de43c2feed43505', '0x2d5875ab0efb999c1f49c798acb9efbd1cfbf63c'],
  rewards: ['0x66eed5ff1701e6ed8470dc391f05e27b1d0657eb'],
}

const sMPX: Contract = {
  chain: 'fantom',
  address: '0xa4157e273d88ff16b3d8df68894e1fd809dbc007',
  underlyings: ['0x66eed5ff1701e6ed8470dc391f05e27b1d0657eb', '0xe0f606e6730be531eeaf42348de43c2feed43505'],
  rewards: ['0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83', '0xe0f606e6730be531eeaf42348de43c2feed43505'],
  rewarder: '0x2d5875ab0efb999c1f49c798acb9efbd1cfbf63c',
}

const MLP: Contract = {
  chain: 'fantom',
  address: '0xd5c313de2d33bf36014e6c659f13ace112b80a8e',
  decimals: 18,
  symbol: 'MLP',
}

const vault: Contract = {
  chain: 'fantom',
  address: '0x3CB54f0eB62C371065D739A34a775CC16f46563e',
}

export const getContracts = async (ctx: BaseContext) => {
  const [fmtMLPContract, fmtfMLPContract] = await Promise.all([
    getMorphexContract(ctx, MLP, vault),
    getMorphexContract(ctx, fMLP, vault),
  ])

  return {
    contracts: { fmtMLPContract, fmtfMLPContract, sMPX, farmers: [vMLP, vMPX] },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    fmtMLPContract: getMorphexMLPBalances,
    fmtfMLPContract: getMorphexStakeMLPBalances,
    sMPX: getMorphexStakeMPXBalances,
    farmers: getMorphexYieldBalances,
  })

  return {
    groups: [{ balances }],
  }
}
