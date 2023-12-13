import { getProtectorateBalance, getProtectorateFarmBalance } from '@adapters/protectorate-protocol/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sPRTC: Contract = {
  chain: 'ethereum',
  address: '0xee9bf5aadbfb8e7e7dd4098915043edd36ce26f7',
  token: '0xb9098D3669A78e9AfE8b94a97290407400D9dA31',
}

const WETH_PLV: Contract = {
  chain: 'ethereum',
  address: '0xaf53431488e871d103baa0280b6360998f0f9926',
}

export const getContracts = () => {
  return {
    contracts: { sPRTC, WETH_PLV },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sPRTC: getProtectorateBalance,
    WETH_PLV: getProtectorateFarmBalance,
  })

  return {
    groups: [{ balances }],
  }
}
