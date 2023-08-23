import type { ClickHouseClient } from '@clickhouse/client'
import { type Chain, chainByChainId } from '@lib/chains'
import { fromDateTime } from '@lib/fmt'

export interface GasUsed {
  chain: Chain
  day: Date
  total_gas_used: number
  avg_gas_used: number
  median_gas_used: number
}

export interface GasUsedStorage {
  chain: string
  day: string
  total_gas_used: string
  avg_gas_used: string
  median_gas_used: string
}

export function fromStorage(gasUsedsStorage: GasUsedStorage[]) {
  const gasUseds: GasUsed[] = []

  for (const gasUsedStorage of gasUsedsStorage) {
    const chain = chainByChainId[parseInt(gasUsedStorage.chain)]
    if (!chain) {
      continue
    }

    const gasUsed: GasUsed = {
      chain: chain.id,
      day: fromDateTime(gasUsedStorage.day),
      total_gas_used: parseInt(gasUsedStorage.total_gas_used),
      avg_gas_used: parseInt(gasUsedStorage.avg_gas_used),
      median_gas_used: parseInt(gasUsedStorage.median_gas_used),
    }

    gasUseds.push(gasUsed)
  }

  return gasUseds
}

export type Window = 'W' | 'M' | 'Y'

export async function selectGasPriceChart(client: ClickHouseClient, chainId: number, window: Window) {
  const days: { [key in Window]: number } = {
    W: 7,
    M: 30,
    Y: 365,
  }

  const limit = days[window] || 30

  const queryRes = await client.query({
    query:
      'SELECT * FROM evm_indexer.gas_used_mv WHERE "chain" = {chainId: UInt64} ORDER BY "day" DESC LIMIT {limit: UInt8};',
    query_params: {
      chainId,
      limit,
    },
  })

  const res = (await queryRes.json()) as {
    data: GasUsedStorage[]
  }

  return fromStorage(res.data)
}
