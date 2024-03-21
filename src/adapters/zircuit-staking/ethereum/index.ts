import { getZircuitRestaking } from '@adapters/zircuit-staking/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const allowLists: `0x${string}`[] = [
  '0x4c9edd5852cd905f086c759e8383e09bff1e68b3', // USDe
  '0xbf5495Efe5DB9ce00f80364C8B423567e58d2110', // ezETH
  '0xa1290d69c65a6fe4df752f95823fae25cb99e5a7', // rsETH
  '0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee', // weETH
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', // wstETH
  '0x8c1bed5b9a0928467c9b1341da1d7bd5e10b6549', // lsETH
  '0x32bd822d615A3658A68b6fDD30c2fcb2C996D678', // mswETH
  '0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0', // rswETH
  '0xE46a5E19B19711332e33F33c2DB3eA143e86Bc10', // mwBETH
  '0xf951E335afb289353dc249e82926178EaC7DEd78', // swETH
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
]

const reStaker: Contract = {
  chain: 'ethereum',
  address: '0xf047ab4c75cebf0eb9ed34ae2c186f3611aeafa6',
  underlyings: allowLists,
}

export const getContracts = () => {
  return {
    contracts: { reStaker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    reStaker: getZircuitRestaking,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1709510400,
}
