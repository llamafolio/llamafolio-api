import { getMagpieStaker } from '@adapters/magpie/arbitrum/stake'
import { getMagpieBalances, getMGPBalance } from '@adapters/magpie/common/balance'
import { getMagpieContracts } from '@adapters/magpie/common/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const masterChef: Contract = {
  chain: 'arbitrum',
  address: '0x664cc2bcae1e057eb1ec379598c5b743ad9db6e7',
  rewards: ['0xa61f74247455a40b01b0559ff6274441fafa22a3'],
}

const MGPContract: Contract = {
  chain: 'arbitrum',
  address: '0x536599497Ce6a35FC65C7503232Fec71A84786b9',
  staker: '0xca27B9c894DAcd41457F4DC8A9A061Baf5308176',
  underlyings: ['0xa61f74247455a40b01b0559ff6274441fafa22a3'],
}

const staker: Contract = {
  chain: 'arbitrum',
  address: '0x8bf06db445704bcdde0c18be219442314869e634',
  token: '0x0c880f6761f1af8d9aa9c466984b80dab9a8c9e8',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getMagpieContracts(ctx, masterChef)

  return {
    contracts: { masterChef, pools, MGPContract, staker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getMagpieBalances(...args, masterChef),
    MGPContract: getMGPBalance,
    staker: getMagpieStaker,
  })

  return {
    groups: [{ balances }],
  }
}
