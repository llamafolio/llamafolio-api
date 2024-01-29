import type { AdapterConfig } from "@lib/adapter";import { getLybraFarmBalances } from '@adapters/lybra-v1/ethereum/farm'
import { getLybraLendingBalances } from '@adapters/lybra-v1/ethereum/lend'
import { getLybraVestBalance } from '@adapters/lybra-v1/ethereum/vest'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const lendingPool: Contract = {
  chain: 'ethereum',
  address: '0x97de57ec338ab5d51557da3434828c5dbfada371',
  token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
}

const vester: Contract = {
  chain: 'ethereum',
  address: '0x850f078a8469b1c7cdfd6635aaf02fd370382eb7',
  token: '0xf1182229b71e79e504b1d2bf076c15a277311e05',
  underlyings: ['0xf1182229b71e79e504b1d2bf076c15a277311e05'],
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0x571042b7138ee957a96a6820fce79c48fe2da816',
  token: '0xf1182229b71e79e504b1d2bf076c15a277311e05',
  underlyings: ['0xf1182229b71e79e504b1d2bf076c15a277311e05'],
}

const crvFarmer: Contract = {
  chain: 'ethereum',
  address: '0xbaaa3053e773544561a119db1f86985581d3fe7f',
  pool: '0x880F2fB3704f1875361DE6ee59629c6c6497a5E3',
  token: '0xb2C35aC676F4A002669e195CF4dc50DDeDF6F0fA',
  underlyings: ['0x97de57eC338AB5d51557DA3434828C5DbFaDA371', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  rewards: ['0x571042B7138ee957a96A6820FCe79c48fe2DA816'],
  provider: 'curve',
}

const uniFarmer: Contract = {
  chain: 'ethereum',
  address: '0x04394c8e17aced699a90ae9448a184b3fc6b6042',
  token: '0x061883CD8a060eF5B8d83cDe362C3Fdbd8162EeE',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xf1182229b71e79e504b1d2bf076c15a277311e05'],
  provider: 'swap',
}

export const getContracts = () => {
  return {
    contracts: { lendingPool, vester, staker, farmers: [crvFarmer, uniFarmer] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lendingPool: getLybraLendingBalances,
    vester: getLybraVestBalance,
    staker: getSingleStakeBalance,
    farmers: getLybraFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1682380800,
                  }
                  