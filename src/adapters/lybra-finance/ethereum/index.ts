import { getLybraLendingBalances } from '@adapters/lybra-finance/ethereum/lend'
import { getLybraVestBalance } from '@adapters/lybra-finance/ethereum/vest'
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
  token: '0xF1182229B71E79E504b1d2bF076C15a277311e05',
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0x571042b7138ee957a96a6820fce79c48fe2da816',
  token: '0xF1182229B71E79E504b1d2bF076C15a277311e05',
  underlyings: ['0xF1182229B71E79E504b1d2bF076C15a277311e05'],
}

export const getContracts = () => {
  return {
    contracts: { lendingPool, vester, staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lendingPool: getLybraLendingBalances,
    vester: getLybraVestBalance,
    staker: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
