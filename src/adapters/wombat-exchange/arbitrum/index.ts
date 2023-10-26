import { getWombatPoolsContracts } from '@adapters/wombat-exchange/common/contract'
import { getWombatFarmBalances } from '@adapters/wombat-exchange/common/farm'
import { getWombatLockBalance } from '@adapters/wombat-exchange/common/lock'
import { getWombatLpBalances } from '@adapters/wombat-exchange/common/lp'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const WOM: Token = {
  chain: 'arbitrum',
  address: '0x7b5eb3940021ec0e8e463d5dbb4b7b09a89ddf96',
  decimals: 18,
  symbol: 'WOM',
}

const mainPools: Contract = {
  chain: 'arbitrum',
  address: '0xc6bc781E20f9323012F6e422bdf552Ff06bA6CD1',
}
const overnightPools: Contract = {
  chain: 'arbitrum',
  address: '0xCF20fDA54e37f3fB456930f02fb07FccF49e4849',
}
const mimPools: Contract = {
  chain: 'arbitrum',
  address: '0x29eeB257a2A6eCDE2984aCeDF80A1B687f18eC91',
}
const bobPools: Contract = {
  chain: 'arbitrum',
  address: '0x917caF2b4D6040a9D67A5F8CEfC4F89d1b214c1A',
}
const mWomPools: Contract = {
  chain: 'arbitrum',
  address: '0x90eCddEC4E4116E30769A4e1EA52c319aca338B6',
}
const mwxWomPools: Contract = {
  chain: 'arbitrum',
  address: '0xEE9b42b40852a53c7361F527e638B485D49750cD',
}
const qWomPools: Contract = {
  chain: 'arbitrum',
  address: '0x12Fa5AB079CFf564d599466d39715D35d90Af978',
}
const frxETHPools: Contract = {
  chain: 'arbitrum',
  address: '0x20D7ee728900848752FA280fAD51aF40c47302f1',
}
const FRAX_MAI_USDPools: Contract = {
  chain: 'arbitrum',
  address: '0x4a8686df475D4c44324210FFA3Fc1DEA705296e0',
}
const jUSDCPools: Contract = {
  chain: 'arbitrum',
  address: '0xc7a6bA5F28993BaDb566007bD2E0CB253c431974',
}

const masterChef: Contract = {
  chain: 'arbitrum',
  address: '0x62a83c6791a3d7950d823bb71a38e47252b6b6f4',
  rewards: [WOM],
}

const locker: Contract = {
  chain: 'arbitrum',
  address: '0x488b34f704a601daeef14135146a3da79f2d3efc',
  underlyings: [WOM],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getWombatPoolsContracts(ctx, [
    mainPools,
    overnightPools,
    mimPools,
    bobPools,
    mWomPools,
    mwxWomPools,
    qWomPools,
    frxETHPools,
    FRAX_MAI_USDPools,
    jUSDCPools,
  ])

  return {
    contracts: { pools, locker },
    revalidate: 60 * 60,
  }
}

const getWombatBalances = async (ctx: BalancesContext, pools: Contract[]) => {
  return Promise.all([getWombatLpBalances(ctx, pools), getWombatFarmBalances(ctx, pools, masterChef)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getWombatBalances,
    locker: getWombatLockBalance,
  })

  return {
    groups: [{ balances }],
  }
}
