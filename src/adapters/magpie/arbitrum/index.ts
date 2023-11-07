import { getMasterMagpieBalances } from '@adapters/magpie/common/balance'
import { getMagpiePools } from '@adapters/magpie/common/magpie'
import { getPenpiePools } from '@adapters/magpie/common/penpie'
import { getRadpiePools } from '@adapters/magpie/common/radpie'
import { getMagpieStaker } from '@adapters/magpie/common/stake'
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

const vlMGP: Contract = {
  chain: 'arbitrum',
  address: '0x536599497Ce6a35FC65C7503232Fec71A84786b9',
  underlyings: ['0xa61f74247455a40b01b0559ff6274441fafa22a3'],
  rewards: [
    '0xa61f74247455a40b01b0559ff6274441fafa22a3',
    '0x509fd25ee2ac7833a017f17ee8a6fb4aaf947876',
    '0x912ce59144191c1204e64559fe8253a0e49e6548',
    '0x4cfa50b7ce747e2d61724fcac57f24b748ff2b2a',
    '0x2ac2b254bc18cd4999f64773a966e4f4869c34ee',
    '0xb688ba096b7bb75d7841e47163cd12d18b36a5bf',
  ],
}

const mWOMsv: Contract = {
  chain: 'arbitrum',
  address: '0x21804fb90593458630298f10a85094cb6d3b07db',
  underlyings: ['0x7b5eb3940021ec0e8e463d5dbb4b7b09a89ddf96'],
  rewards: [
    '0xa61f74247455a40b01b0559ff6274441fafa22a3',
    '0x7b5eb3940021ec0e8e463d5dbb4b7b09a89ddf96',
    '0x912ce59144191c1204e64559fe8253a0e49e6548',
    '0x4cfa50b7ce747e2d61724fcac57f24b748ff2b2a',
    '0x2ac2b254bc18cd4999f64773a966e4f4869c34ee',
  ],
}

export const getContracts = async (ctx: BaseContext) => {
  const [magpiePools, penpiePools, radpiePools] = await Promise.all([
    getMagpiePools(ctx, masterMagpie),
    getPenpiePools(ctx, masterPenpie),
    getRadpiePools(ctx, masterRadpie),
  ])

  return {
    contracts: { magpiePools: [...magpiePools, vlMGP, mWOMsv], penpiePools, radpiePools, staker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  console.log(contracts)

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
