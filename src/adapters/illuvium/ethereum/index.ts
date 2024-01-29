import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getILVBalances, getILVExternalTokensBalances } from './balance'
import { getILVContracts } from './contract'

export interface IPools {
  address: `0x${string}`
  provider: string
  staker: string
}

const pools: IPools[] = [
  {
    // ILV
    address: '0x7f5f854ffb6b7701540a00c69c4ab2de2b34291d',
    staker: '0x25121EDDf746c884ddE4619b573A7B10714E2a36',
    provider: 'illuvium',
  },
  {
    // ILV-ETH
    address: '0xe98477bdc16126bb0877c6e3882e3edd72571cc2',
    staker: '0x8B4d8443a0229349A9892D4F7CbE89eF5f843F72',
    provider: 'sushi',
  },
]

const linkStaker: Contract = {
  chain: 'ethereum',
  address: '0xc759c6233e9c1095328d29cfff319780b28cecd8',
  token: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
}

const axsStaker: Contract = {
  chain: 'ethereum',
  address: '0x099a3b242dcec87e729cefc6157632d7d5f1c4ef',
  token: '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b',
}

const snxxStaker: Contract = {
  chain: 'ethereum',
  address: '0x9898d72c2901d09e72a426d1c24b6ab90eb100e7',
  token: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
}

export const getContracts = async (ctx: BaseContext) => {
  const contracts = await getILVContracts(ctx, pools)

  return {
    contracts: { contracts, pools: [linkStaker, axsStaker, snxxStaker] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    contracts: getILVBalances,
    pools: getILVExternalTokensBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1625094000,
                  }
                  