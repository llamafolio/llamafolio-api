import { getSpiceNftStakeBalances, getSpiceStakeBalances } from '@adapters/spice-finance/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vault: Contract = {
  chain: 'ethereum',
  address: '0x6110d61dd1133b0f845f1025d6678cd22a11a2fe',
  token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
}

const stakers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xfc287513e2dd58fbf952eb0ed05d511591a6215b',
    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  {
    chain: 'ethereum',
    address: '0xae11ae7cad244dd1d321ff2989543bcd8a6db6df',
    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  {
    chain: 'ethereum',
    address: '0xd68871bd7d28572860b2e0ee5c713b64445104f9',
    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
]

export const getContracts = () => {
  return {
    contracts: { stakers, vault },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getSpiceStakeBalances,
    vault: getSpiceNftStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
