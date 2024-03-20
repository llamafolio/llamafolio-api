/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs'
import path from 'node:path'

import type { BalancesConfig, Contract } from '@lib/adapter'
import { chainByChainId } from '@lib/chains'

export interface JobStatus {
  // YYYY-MM-DD
  prevDate: string
  // YYYY-MM-DD
  date: string
  version?: number
  error?: string
}

/**
 * NOTE: Snapshots are recorded at end of day (includes transactions of the day)
 */
export interface BalancesSnapshotStatus {
  // YYYY-MM-DD
  prevDate: string
  // YYYY-MM-DD
  date: string
  version: number
  // Cumulative e.g if a user deposited at day d0, he is still considered active at d1 and later
  // (until he fully exits his position)
  activeUsers: string[]
  // New users who were not active before and entered a non-empty position
  usersInflows: string[]
  // Users who were active before and fully exited their position
  usersOutflows: string[]
  errors: string[]
}

export interface BalancesSnapshot {
  contracts: Contract[]
  balancesConfig: BalancesConfig
}

function deserializeBalance(key: string, value: any) {
  if (key === 'amount' && typeof value === 'string') {
    return BigInt(value)
  }

  return value
}

export async function getBalancesSnapshots(adapterId: string, chainId: number, date: string) {
  try {
    const chain = chainByChainId[chainId]?.id
    const src = path.join(
      __dirname,
      '..',
      '..',
      'internal',
      'balances_snapshots',
      adapterId,
      chain,
      date,
      'balances.json',
    )
    const buff = fs.readFileSync(src, 'utf8')
    return JSON.parse(buff, deserializeBalance) as { [address: string]: BalancesSnapshot }
  } catch (error) {
    return null
  }
}

export async function getBalancesSnapshotStatus(adapterId: string, chainId: number, date: string) {
  try {
    const chain = chainByChainId[chainId]?.id
    const src = path.join(
      __dirname,
      '..',
      '..',
      'internal',
      'balances_snapshots',
      adapterId,
      chain,
      date,
      'status.json',
    )
    const buff = fs.readFileSync(src, 'utf8')
    return JSON.parse(buff) as BalancesSnapshotStatus
  } catch (error) {
    return null
  }
}

export async function getBalancesJobStatus(adapterId: string, chainId: number) {
  try {
    const chain = chainByChainId[chainId]?.id
    const src = path.join(__dirname, '..', '..', 'internal', 'balances_snapshots', adapterId, chain, 'status.json')
    const buff = fs.readFileSync(src, 'utf8')
    return JSON.parse(buff) as JobStatus
  } catch (error) {
    return null
  }
}
