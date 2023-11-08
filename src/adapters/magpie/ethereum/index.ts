import { getMasterBalances } from '@adapters/magpie/common/balance'
import { getPenpiePools } from '@adapters/magpie/common/penpie'
import { getMagpieStaker } from '@adapters/magpie/common/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const masterPenpie: Contract = {
  chain: 'ethereum',
  address: '0x16296859c15289731521f199f0a5f762df6347d0',
  rewards: ['0x7dedbce5a2e31e4c75f87fea60bf796c17718715'],
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0xf9619e8b01acc23fac7ee0aeb1258433b85814ec',
  token: '0x808507121b80c02388fad14726482e061b8da827',
}

export const getContracts = async (ctx: BaseContext) => {
  const penpiePools = await getPenpiePools(ctx, masterPenpie)

  return {
    contracts: { penpiePools, staker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getMagpieStaker,
    penpiePools: (...args) => getMasterBalances(...args, masterPenpie),
  })

  return {
    groups: [{ balances }],
  }
}
