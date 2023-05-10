import { getApiURL } from 'test/config/api-url'
import { bench, describe } from 'vitest'

const apiURL = getApiURL('local')

const walletAddress = '0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50'

const getBalancesTokens = async (address: string) =>
  fetch(`${apiURL}/balances/${address}/tokens`).then((response) => response.json())

describe.only('getTokensBalances', () => {
  bench('v4', async () => await getBalancesTokens(walletAddress), { iterations: 100 })
})
