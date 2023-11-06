import { getMasterMagpieBalances } from '@adapters/magpie/arbitrum/balance'
import { getMagpieContracts } from '@adapters/magpie/arbitrum/contract'
import { getMagpieStaker } from '@adapters/magpie/arbitrum/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const masterMagpie: Contract = {
  chain: 'arbitrum',
  address: '0x664cc2bcae1e057eb1ec379598c5b743ad9db6e7',
  rewards: ['0xa61f74247455a40b01b0559ff6274441fafa22a3'],
}
const masterPenpie: Contract = {
  chain: 'arbitrum',
  address: '0x0776c06907ce6ff3d9dbf84ba9b3422d7225942d',
  rewards: ['0x2ac2b254bc18cd4999f64773a966e4f4869c34ee'],
}

const masterRadpie: Contract = {
  chain: 'arbitrum',
  address: '0xc9cb578d613d729c3c4c8ef7d46cb814570f2baa',
  rewards: ['0x3082cc23568ea640225c2467653db90e9250aaa0'],
}

const staker: Contract = {
  chain: 'arbitrum',
  address: '0x8bf06db445704bcdde0c18be219442314869e634',
  token: '0x0c880f6761f1af8d9aa9c466984b80dab9a8c9e8',
}

export const getContracts = async (ctx: BaseContext) => {
  const { magpiePools, penpiePools, radpiePools } = await getMagpieContracts(ctx, [
    masterMagpie,
    masterPenpie,
    masterRadpie,
  ])

  return {
    contracts: { magpiePools, penpiePools, radpiePools, staker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getMagpieStaker,
    magpiePools: (...args) => getMasterMagpieBalances(...args, masterMagpie),
    penpiePools: (...args) => getMasterMagpieBalances(...args, masterPenpie),
    radpiePools: (...args) => getMasterMagpieBalances(...args, masterRadpie),
  })

  return {
    groups: [{ balances }],
  }
}
