import { getParaspaceBPTFarmBalances, getParaspaceBPTStakeBalances } from '@adapters/paraswap/ethereum/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalances } from '@lib/stake'

const bptParaStake: Contract = {
  chain: 'ethereum',
  address: '0x593f39a4ba26a9c8ed2128ac95d109e8e403c485',
  token: '0xCB0e14e96f2cEFA8550ad8e4aeA344F211E5061d',
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xcAfE001067cDEF266AfB7Eb5A286dCFD277f3dE5'],
  poolId: '0xcb0e14e96f2cefa8550ad8e4aea344f211e5061d00020000000000000000011a',
  vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  provider: 'balancer',
}

const bptParaFarmer: Contract = {
  chain: 'ethereum',
  address: '0xc8dc2ec5f5e02be8b37a8444a1931f02374a17ab',
  token: '0xCB0e14e96f2cEFA8550ad8e4aeA344F211E5061d',
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xcAfE001067cDEF266AfB7Eb5A286dCFD277f3dE5'],
  poolId: '0xcb0e14e96f2cefa8550ad8e4aea344f211e5061d00020000000000000000011a',
  vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  provider: 'balancer',
}

const stakers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x716fbc68e0c761684d9280484243ff094cc5ffab',
    token: '0xcAfE001067cDEF266AfB7Eb5A286dCFD277f3dE5',
  },
  {
    chain: 'ethereum',
    address: '0xea02df45f56a690071022c45c95c46e7f61d3eab',
    token: '0xcAfE001067cDEF266AfB7Eb5A286dCFD277f3dE5',
  },
  {
    chain: 'ethereum',
    address: '0x6b1d394ca67fdb9c90bbd26fe692dda4f4f53ecd',
    token: '0xcAfE001067cDEF266AfB7Eb5A286dCFD277f3dE5',
  },
  {
    chain: 'ethereum',
    address: '0x55a68016910a7bcb0ed63775437e04d2bb70d570',
    token: '0xcAfE001067cDEF266AfB7Eb5A286dCFD277f3dE5',
  },
  {
    chain: 'ethereum',
    address: '0xc3359dbdd579a3538ea49669002e8e8eea191433',
    token: '0xcAfE001067cDEF266AfB7Eb5A286dCFD277f3dE5',
  },
  {
    chain: 'ethereum',
    address: '0x37b1e4590638a266591a9c11d6f945fe7a1adaa7',
    token: '0xcAfE001067cDEF266AfB7Eb5A286dCFD277f3dE5',
  },
  {
    chain: 'ethereum',
    address: '0x03c1eaff32c4bd67ee750ab75ce85ba7e5aa65fb',
    token: '0xcAfE001067cDEF266AfB7Eb5A286dCFD277f3dE5',
  },
  {
    chain: 'ethereum',
    address: '0x36d69afe2194f9a1756ba1956ce2e0287a40f671',
    token: '0xcAfE001067cDEF266AfB7Eb5A286dCFD277f3dE5',
  },
]

export const getContracts = () => {
  return {
    contracts: { bptParaStake, stakers, bptParaFarmer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    bptParaStake: getParaspaceBPTStakeBalances,
    stakers: getSingleStakeBalances,
    bptParaFarmer: getParaspaceBPTFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
