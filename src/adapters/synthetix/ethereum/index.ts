import { getSNXBalances } from '@adapters/synthetix/common/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const SNX: Contract = {
  chain: 'ethereum',
  address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
  token: '0xd0dA9cBeA9C3852C5d63A95F9ABCC4f6eA0F9032',
  underlyings: ['0x10A5F7D9D65bCc2734763444D4940a31b109275f'],
  rewarder: '0x83105D7CDd2fd9b8185BFF1cb56bB1595a618618',
}

export const getContracts = async () => {
  return {
    contracts: { SNX },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    SNX: getSNXBalances,
  })

  return {
    groups: [{ balances }],
  }
}
