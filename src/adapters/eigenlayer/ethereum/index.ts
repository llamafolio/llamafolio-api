import { getEigenlayerBalances } from '@adapters/eigenlayer/ethereum/balance'
import { getEigenlayerPools } from '@adapters/eigenlayer/ethereum/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolManager: Contract = {
  chain: 'ethereum',
  address: '0x858646372CC42E1A627fcE94aa7A7033e7CF075A',
}

const poolAddresses: `0x${string}`[] = [
  '0x93c4b944d05dfe6df7645a86cd2206016c51564d',
  '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6',
  '0x1bee69b7dfffa4e2d53c2a2df135c388ad25dcd2',
  '0x9d7ed45ee2e8fc5482fa2428f15c971e6369011d',
  '0x54945180db7943c0ed0fee7edab2bd24620256bc',
  '0x57ba429517c3473b6d34ca9acd56c0e735b94c02',
  '0xa4c637e0f704745d182e4d38cab7e7485321d059',
  '0x7ca911e83dabf90c90dd3de5411a10f1a6112184',
  '0x13760f50a9d7377e4f20cb8cf9e4c26586c658ff',
]

export const getContracts = async (ctx: BaseContext) => {
  const pool = await getEigenlayerPools(ctx, poolManager, poolAddresses)

  return {
    contracts: { pool },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pool: getEigenlayerBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1686700800,
}
