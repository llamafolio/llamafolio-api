import { getEqPoolBalances, getSingleEqBalance, getStkEqBalance } from '@adapters/equilibria/common/balance'
import { getEqLockerBalance } from '@adapters/equilibria/common/lock'
import { getEqPoolsContracts } from '@adapters/equilibria/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stkEpendle: Contract = {
  chain: 'ethereum',
  address: '0xd30d6fd662c0d92b49f3c3e478e125ba1d968059',
  token: '0x22Fc5A29bd3d6CCe19a06f844019fd506fCe4455',
}

const ePendle: Contract = {
  chain: 'ethereum',
  address: '0x357f55b46821a6c6e476cc32ebb2674cd125e849',
  token: '0x22Fc5A29bd3d6CCe19a06f844019fd506fCe4455',
  rewards: [
    '0x808507121B80c02388fAd14726482e061B8da827',
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    '0xeFEfeFEfeFeFEFEFEfefeFeFefEfEfEfeFEFEFEf',
    '0xd6eCfD0d5f1Dfd3ad30f267a3a29b3E1bC4fd54f',
  ],
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0xd8967B2B15b3CDF96039b7407813B4037f73ec27',
  token: '0xfE80D611c6403f70e5B1b9B722D2B3510B740B2B',
  rewards: ['0x22Fc5A29bd3d6CCe19a06f844019fd506fCe4455'],
}

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0x4d32c8ff2facc771ec7efc70d6a8468bc30c26bf',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getEqPoolsContracts(ctx, masterChef)

  return {
    contracts: { pools, locker, ePendle, stkEpendle },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getEqPoolBalances,
    locker: getEqLockerBalance,
    ePendle: getSingleEqBalance,
    stkEpendle: getStkEqBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1686182400,
}
