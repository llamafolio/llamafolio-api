import { getVesperStakeBalances, getvVSPStakeBalance } from '@adapters/vesper/common/balance'
import { getVesperStakeContracts } from '@adapters/vesper/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const STAKING_URL = 'https://api.vesper.finance/pools?stages=prod'

const vVSP: Contract = {
  chain: 'ethereum',
  address: '0xbA4cFE5741b357FA371b506e5db0774aBFeCf8Fc',
  underlyings: ['0x1b40183efb4dd766f11bda7a7c3ad8982e998421'],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getVesperStakeContracts(ctx, STAKING_URL)

  return {
    contracts: { pools, vVSP },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getVesperStakeBalances,
    vVSP: getvVSPStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1649376000,
}
