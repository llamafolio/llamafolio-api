import { getLinkStaker_v1Balance, getLinkStaker_v2Balances } from '@adapters/chainlink/ethereum/balance'
import type { BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const LINK: Contract = {
  chain: 'ethereum',
  address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  decimals: 18,
  symbol: 'LINK',
}

const sLINK: Contract = {
  chain: 'ethereum',
  address: '0x3feb1e09b4bb0e7f0387cee092a52e85797ab889',
  token: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
}

const v2Stakers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xbc10f2e862ed4502144c7d632a3459f49dfcdb5e',
    token: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    rewarder: '0x996913c8c08472f584ab8834e925b06D0eb1D813',
  },
  {
    chain: 'ethereum',
    address: '0xa1d76a7ca72128541e9fcacafbda3a92ef94fdc5',
    token: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    rewarder: '0x996913c8c08472f584ab8834e925b06D0eb1D813',
  },
]

export const getContracts = async () => {
  return {
    contracts: { LINK, sLINK, v2Stakers },
  }
}

async function getLinkBalances(ctx: BalancesContext, _LINK: Contract, sLINK: Contract, v2Stakers: Contract[]) {
  const [v1kBalances, v2Balances] = await Promise.all([
    getLinkStaker_v1Balance(ctx, sLINK),
    getLinkStaker_v2Balances(ctx, v2Stakers),
  ])
  return [v1kBalances, ...v2Balances]
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    LINK: (...args) => getLinkBalances(...args, sLINK, v2Stakers),
  })

  return {
    groups: [{ balances }],
  }
}
