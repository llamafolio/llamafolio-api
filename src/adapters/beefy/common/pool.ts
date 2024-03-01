import type { BaseContext, Contract } from '@lib/adapter'
import { isNotNullish } from '@lib/type'

const NATIVE: Record<string, string> = {
  ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  bsc: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  arbitrum: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  base: '0x4200000000000000000000000000000000000006',
  optimism: '0x4200000000000000000000000000000000000006',
  fantom: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
  polygon: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
}

export async function getBeefyPools(ctx: BaseContext): Promise<Contract[]> {
  const API_VAULT_URL = `https://api.beefy.finance/vaults`
  const API_BOOST_URL = `https://api.beefy.finance/boosts`

  const [vaults, boosts]: [any[], any[]] = await Promise.all([
    fetch(API_VAULT_URL).then((response) => response.json()),
    fetch(API_BOOST_URL).then((response) => response.json()),
  ])

  const pools: { [key: string]: Contract } = {}

  vaults
    .filter((vault) => vault.chain === ctx.chain && vault.status !== 'eol')
    .forEach((vault) => {
      const {
        chain,
        earnContractAddress,
        tokenAddress,
        token,
        tokenDecimals,
        tokenProviderId,
        assets,
        strategy,
        oracleId,
        id,
      } = vault

      pools[id] = {
        chain,
        address: earnContractAddress,
        symbol: token,
        decimals: tokenDecimals,
        lpToken: tokenAddress,
        underlyings: assets,
        strategy,
        beefyKey: oracleId,
        provider: tokenProviderId,
      }
    })

  const fmtBoosts = boosts
    .filter((boost) => boost.chain === ctx.chain && boost.status === 'active')
    .map((boost) => {
      const { chain, earnContractAddress, earnedTokenAddress, earnedTokenDecimals, earnedToken, poolId, status } = boost

      const boosterContract = {
        chain,
        address: earnContractAddress,
        boostStatus: status,
        rewards: [{ chain, address: earnedTokenAddress, decimals: earnedTokenDecimals, symbol: earnedToken }],
        beefyKey: poolId,
      }

      if (!pools[poolId]) return null

      return {
        ...pools[poolId.toLowerCase()],
        earnContractAddress,
        boostStatus: boosterContract.boostStatus,
        rewards: boosterContract.rewards,
      }
    })
    .filter(isNotNullish)

  return getBeefyUnderlyings(ctx, [...Object.values(fmtBoosts), ...Object.values(pools)])
}

async function getBeefyUnderlyings(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const API_URL = `https://api.beefy.finance/tokens/${ctx.chain}`
  const tokens = await fetch(API_URL).then((response) => response.json())

  for (const pool of pools) {
    const { underlyings } = pool

    if (!underlyings) continue

    for (let i = 0; i < underlyings.length; i++) {
      const underlying = underlyings[i] as string
      const token = tokens[underlying]
      if (token) {
        const { chainId, address, symbol, decimals } = token
        const fmtAddress = address === 'native' ? NATIVE[ctx.chain] : address

        underlyings[i] = { chain: chainId, address: fmtAddress, symbol, decimals }
      }
    }
  }

  return pools
}
