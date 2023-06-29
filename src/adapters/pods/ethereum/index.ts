import { getPodsFarmBalances } from '@adapters/pods/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x463f9ed5e11764eb9029762011a03643603ad879',
    underlyings: ['0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'],
  },
  {
    chain: 'ethereum',
    address: '0x5fe4b38520e856921978715c8579d2d7a4d2274f',
    underlyings: ['0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'],
  },
  {
    chain: 'ethereum',
    address: '0x287f941ab4b5aadad2f13f9363fcec8ee312a969',
    underlyings: ['0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c'],
  },
  {
    chain: 'ethereum',
    address: '0xbab1e772d70300422312dff12daddcb60864bd41',
    underlyings: ['0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'],
  },
]

export const getContracts = () => {
  return {
    contracts: { farmers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmers: getPodsFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
