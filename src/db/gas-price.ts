import type { Chain } from '@lib/chains'
import type { PoolClient } from 'pg'
import format from 'pg-format'

export interface GasPrice {
  timestamp: Date
  minGasPrice: number
  medianGasPrice: number
}

export interface GasPriceStorage {
  timestamp: string
  min_gas_price: string
  median_gas_price: string
}

export function fromRowStorage(gasPriceStorage: GasPriceStorage) {
  const gasPrice: GasPrice = {
    timestamp: new Date(gasPriceStorage.timestamp),
    minGasPrice: parseFloat(gasPriceStorage.min_gas_price),
    medianGasPrice: parseFloat(gasPriceStorage.median_gas_price),
  }

  return gasPrice
}

export type Window = 'D' | 'W' | 'M' | 'Y'

export async function selectGasPriceChart(client: PoolClient, chain: Chain, window: Window) {
  const views: { [key in Window]: string } = {
    D: 'gas_price_1D',
    W: 'gas_price_1W',
    M: 'gas_price_1M',
    Y: 'gas_price_1Y',
  }

  const balancesRes = await client.query(format('select * from %I.%s;', chain, views[window]))

  return balancesRes.rows.map(fromRowStorage)
}
