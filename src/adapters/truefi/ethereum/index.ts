import { getTruefiBalances, getTruefiFarmBalance, getTRUStakeBalance } from '@adapters/truefi/ethereum/balance'
import { getTruefiPoolsContracts } from '@adapters/truefi/ethereum/pools'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stakersAddresses: `0x${string}`[] = [
  '0x1ed460d149d48fa7d91703bf4890f97220c09437', // BUSD
  '0xa991356d261fbaf194463af6df8f0464f8f1c742', // USDC
  '0x6002b1dcb26e7b1aa797a17551c6f487923299d7', // USDT
  '0x97ce06c3e3d027715b2d6c22e67d5096000072e5', // TUSD
  '0xa1e72267084192db7387c8cc1328fade470e4149', // Legacy TUSD
]

const stkTRU: Contract = {
  chain: 'ethereum',
  address: '0x23696914ca9737466d8553a2d619948f548ee424',
  underlyings: ['0x4c19596f5aaff459fa38b0f7ed92f11ae6543784'],
  rewards: ['0x4c19596f5aaff459fa38b0f7ed92f11ae6543784'],
  symbol: 'stkTRU',
  decimals: 8,
}

const tfddeltai_III_USDC: Contract = {
  chain: 'ethereum',
  address: '0x044e3e0a83453d6f673170953fda6ed725adb286',
  underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
}

const trueFarm: Contract = {
  chain: 'ethereum',
  address: '0xec6c3fd795d6e6f202825ddb56e01b3c128b0b10',
}

export const getContracts = async (ctx: BaseContext) => {
  const stakers = await getTruefiPoolsContracts(ctx, stakersAddresses)
  return {
    contracts: { stakers, stkTRU, tfddeltai_III_USDC },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stkTRU: getTRUStakeBalance,
    tfddeltai_III_USDC: getTruefiFarmBalance,
    stakers: (...args) => getTruefiBalances(...args, trueFarm),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1611360000,
}
