import { getEigenlayerBalances } from '@adapters/eigenlayer/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const rETH: Contract = {
  chain: 'ethereum',
  address: '0x1bee69b7dfffa4e2d53c2a2df135c388ad25dcd2',
  token: '0xae78736Cd615f374D3085123A210448E74Fc6393',
}

const cbETH: Contract = {
  chain: 'ethereum',
  address: '0x54945180db7943c0ed0fee7edab2bd24620256bc',
  token: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
}

const stETH: Contract = {
  chain: 'ethereum',
  address: '0x93c4b944d05dfe6df7645a86cd2206016c51564d',
  token: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
}

export const getContracts = () => {
  return {
    contracts: { pools: [rETH, cbETH, stETH] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getEigenlayerBalances,
  })

  return {
    groups: [{ balances }],
  }
}
