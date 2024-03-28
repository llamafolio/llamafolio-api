import { getMMYStakeBalance } from '@adapters/mummy-finance/common/balance'
import { getMMYLPContract, getMMYXContract } from '@adapters/mummy-finance/common/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vault: Contract = {
  chain: 'arbitrum',
  address: '0x304951d7172bCAdA54ccAC1E4674862b3d5b3d5b',
}

const fMMY: Contract = {
  chain: 'arbitrum',
  address: '0xad96d9736484e35985773bdf7dba5750dc830042',
}

const sbfMMY: Contract = {
  chain: 'arbitrum',
  address: '0xA30b1C3c8EDE3841dE05F9CdD4D0e097aC4C6D92',
}

export const getContracts = async (ctx: BaseContext) => {
  const mmylp = await getMMYLPContract(ctx, fMMY, vault)
  const mmyx = await getMMYXContract(ctx, sbfMMY)

  console.log(mmyx)

  return {
    contracts: { mmylp },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    mmylp: (...args) => getMMYStakeBalance(...args, vault),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1688601600,
}
