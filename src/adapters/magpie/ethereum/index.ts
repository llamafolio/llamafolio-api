import { getMasterBalances } from '@adapters/magpie/common/balance'
import { getEigenpieStakerBalances } from '@adapters/magpie/common/eigenpie'
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

const rsts: `0x${string}`[] = [
  '0x49446a0874197839d15395b908328a74ccc96bc0',
  '0x32bd822d615a3658a68b6fdd30c2fcb2c996d678',
  '0xe46a5e19b19711332e33f33c2db3ea143e86bc10',
  '0x8a053350ca5f9352a16ded26ab333e2d251dad7c',
  '0xd05728038681bcc79b2d5aeb4d9b002e66c93a40',
  '0x879054273cb2dad631980fa4efe6d25eefe08aa4',
  '0x9a1722b1f4a1bb2f271211ade8e851afc54f77e5',
]

export const getContracts = async (ctx: BaseContext) => {
  const penpiePools = await getPenpiePools(ctx, masterPenpie)
  const eigenpiePools = rsts.map((rst) => ({
    chain: ctx.chain,
    address: rst,
    underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
  }))

  return {
    contracts: { penpiePools, staker, eigenpiePools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getMagpieStaker,
    penpiePools: (...args) => getMasterBalances(...args, masterPenpie),
    eigenpiePools: getEigenpieStakerBalances,
  })

  return {
    groups: [{ balances }],
  }
}
