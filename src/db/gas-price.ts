import { Chain } from '@lib/chains'
import { PoolClient } from 'pg'
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

export async function selectGasPriceChart(client: PoolClient, chain: Chain) {
  const balancesRes = await client.query(format('select * from %I.daily_gas_price;', [chain]))

  return balancesRes.rows.map(fromRowStorage)
}
