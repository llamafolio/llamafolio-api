import { getBlueBerryBalances } from '@adapters/blueberry-lend/ethereum/balance'
import { getBlueBerryPools } from '@adapters/blueberry-lend/ethereum/pool'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = [
  '0xCD68475A160a256a2C0595c36F497B7cD1fC7672',
  '0xb9ea938A795A1765b6Dc1391239a8a4235E9362c',
  '0x8120e2F07c75bcB2BF1aF0e347b3a4f0fD8e5545',
  '0x32619e841C497D1365c37612A3e64680A70E1894',
  '0xCc40ffD2512101c049A62eCE218AA2b5Aa6D2560',
  '0xcCd438a78376955A3b174be619E50Aa3DdD65469',
  '0xE1a50DdDc74D2cc557781241860f82db2F99f4f4',
  '0x1413E54AEC40DE7Aab54251B09FA2268b317540c',
  '0xB0269Bb4c541D84D69fE710B0983C0A833efaAcC',
  '0x6faA7815F6a2f5FBf2e4A49A590206cD94925d57',
  '0x0BA5761092727502b48575288B4A2B8f2FB724AE',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getBlueBerryPools(ctx, poolAddresses)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getBlueBerryBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1706572800,
}
