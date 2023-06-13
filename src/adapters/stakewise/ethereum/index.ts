import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getBalancesOf } from '@lib/erc20'

const WETH: Contract = {
  name: 'WETH',
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

const sEth2: Contract = {
  name: 'StakeWise Staked ETH2',
  chain: 'ethereum',
  address: '0xFe2e637202056d30016725477c5da089Ab0A043A',
  decimals: 18,
  symbol: 'sETH2',
  underlyings: [WETH],
  category: 'stake',
}

const rEth2: Contract = {
  name: 'StakeWise Reward ETH2',
  chain: 'ethereum',
  address: '0x20bc832ca081b91433ff6c17f85701b6e92486c5',
  decimals: 18,
  symbol: 'rEth2',
  underlyings: [WETH],
  category: 'reward',
}

export const getContracts = () => {
  return {
    contracts: { stake: [sEth2, rEth2] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const { erc20: balances } = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stake: getBalancesOf,
  })

  return {
    groups: [{ balances }],
  }
}
