import { getKwentaStakeBalance } from '@adapters/kwenta/optimism/balance'
import { getKwentaDepositBalances } from '@adapters/kwenta/optimism/deposit'
import { getContractsFromPerpsProxies } from '@adapters/kwenta/optimism/vault'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const perpsV2Proxies: `0x${string}`[] = [
  '0x5374761526175B59f1E583246E20639909E189cE', // AAVE
  '0x5B6BeB79E959Aac2659bEE60fE0D0885468BF886', // APE
  '0xbB16C7B3244DFA1a6BF83Fcce3EE4560837763CD', // ATOMB
  '0x9De146b5663b82F44E5052dEDe2aA3Fd4CBcDC99', // AUD
  '0xc203A12F298CE73E44F7d45A4f59a43DBfFe204D', // AVAX
  '0x3a52b21816168dfe35bE99b7C5fc209f17a0aDb1', // AXS
  '0x0940B0A96C5e1ba33AEE331a9f950Bb2a6F2Fb25', // BNB
  '0x59b007E9ea8F89b069c43F8f45834d30853e3699', // BTC
  '0x98cCbC721cc05E28a125943D69039B39BE6A21e9', // DOGE
  '0x139F94E4f0e1101c1464a321CBA815c34d58B5D9', // DYDX
  '0x2B3bb4c683BFc5239B029131EEf3B1d214478d93', // ETH
  '0x87AE62c5720DAB812BDacba66cc24839440048d1', // EUR
  '0x27665271210aCff4Fab08AD9Bb657E91866471F0', // FLOW
  '0xC18f85A6DD3Bcd0516a1CA08d3B1f0A4E191A2C4', // FTM
  '0x1dAd8808D8aC58a0df912aDC4b215ca3B93D6C49', // GBP
  '0x31A1659Ca00F617E86Dc765B6494Afe70a5A9c1A', // LINK
  '0x074B8F19fc91d6B2eb51143E1f186Ca0DDB88042', // MATIC
  '0xC8fCd6fB4D15dD7C455373297dEF375a08942eCe', // NEAR
  '0x442b69937a0daf9D46439a71567fABE6Cb69FBaf', // OP
  '0x0EA09D97b4084d859328ec4bF8eBCF9ecCA26F1D', // SOL
  '0x4308427C463CAEAaB50FFf98a9deC569C31E4E87', // UNI
  '0xdcB8438c979fA030581314e5A5Df42bbFEd744a0', // XAG
  '0x549dbDFfbd47bD5639f9348eBE82E63e2f9F777A', // XAU
]

const factory: Contract = {
  chain: 'optimism',
  address: '0x8234F990b149Ae59416dc260305E565e5DAfEb54',
}

const staker: Contract = {
  chain: 'optimism',
  address: '0x6e56a5d49f775ba08041e28030bc7826b13489e0',
  token: '0x920cf626a271321c151d027030d5d08af699456b',
}

export const getContracts = async (ctx: BaseContext) => {
  const vaults: Contract[] = await getContractsFromPerpsProxies(ctx, perpsV2Proxies)

  const accountFactory = { ...factory, vaults }

  return {
    contracts: { accountFactory, vaults, staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    accountFactory: getKwentaDepositBalances,
    staker: getKwentaStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
