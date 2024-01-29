import { getBridgeTreasureBalances, getTreasureBalances } from '@adapters/treasuredao/arbitrum/balance'
import { getTreasureLockerBalances } from '@adapters/treasuredao/arbitrum/locker'
import { getTreasurePools } from '@adapters/treasuredao/arbitrum/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = [
  '0x25d6a1e968bdbebf444997286de7137df1490328',
  '0x3fbfcdc02f649d5875bc9f97281b7ef5a7a9c491',
  '0x70a75ac9537f6cdac553f82b6e39484acc521067',
  '0x587dc30014e10b56907237d4880a9bf8b9518150',
]

const bridgeworldTreasure: Contract = {
  chain: 'arbitrum',
  address: '0xa0a89db1c899c49f98e6326b764bafcf167fc2ce',
  token: '0x539bde0d7dbd336b79148aa742883198bbf60342',
}

const locker: Contract = {
  chain: 'arbitrum',
  address: '0xc0e641c7ea263166a238285556ff61fdf37a4c79',
  token: '0x539bde0d7dbd336b79148aa742883198bbf60342',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getTreasurePools(ctx, poolAddresses)
  return {
    contracts: { pools, bridgeworldTreasure, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getTreasureBalances,
    bridgeworldTreasure: getBridgeTreasureBalances,
    locker: getTreasureLockerBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1643760000,
}
