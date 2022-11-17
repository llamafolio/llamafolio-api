import { Adapter, GetBalancesHandler, Contract } from '@lib/adapter'
import { getMarketsContracts, getMarketsBalances } from './markets'
import { getMStakeContract, getMStakeBalance } from './mStake'
import { getSStakeContract, getSStakeBalance } from './sStake'

const mSPELL_Eth: Contract = {
  name: 'mSpellStaking',
  chain: 'ethereum',
  address: '0xbD2fBaf2dc95bD78Cf1cD3c5235B33D1165E6797',
  decimals: 18,
  symbol: 'mSPELL',
}

const mSPELL_Avax: Contract = {
  name: 'mSpellStaking',
  chain: 'avax',
  address: '0xBd84472B31d947314fDFa2ea42460A2727F955Af',
  decimals: 18,
  symbol: 'mSPELL',
}

const mSPELL_Fantom: Contract = {
  name: 'mSpellStaking',
  chain: 'fantom',
  address: '0xa668762fb20bcd7148Db1bdb402ec06Eb6DAD569',
  decimals: 18,
  symbol: 'mSPELL',
}

const sSPELL_Eth: Contract = {
  name: 'sSpellStaking',
  chain: 'ethereum',
  address: '0x26fa3fffb6efe8c1e69103acb4044c26b9a106a9',
  decimals: 18,
  symbol: 'sSPELL',
}

type Chains = 'ethereum' | 'fantom' | 'avax'

const Cauldron: Record<Chains, string[]> = {
  ethereum: [
    '0x7ce7d9ed62b9a6c5ace1c6ec9aeb115fa3064757',
    '0x7b7473a76D6ae86CE19f7352A1E89F6C9dc39020',
    '0xf179fe36a36B32a4644587B8cdee7A23af98ed37',
    '0x05500e2Ee779329698DF35760bEdcAAC046e7C27',
    '0x003d5A75d284824Af736df51933be522DE9Eed0f',
    '0x98a84EfF6e008c5ed0289655CcdCa899bcb6B99F',
    '0xEBfDe87310dc22404d918058FAa4D56DC4E93f0A',
    '0x0BCa8ebcB26502b013493Bf8fE53aA2B1ED401C1',
    '0x920D9BD936Da4eAFb5E25c6bDC9f6CB528953F9f',
    '0x252dCf1B621Cc53bc22C256255d2bE5C8c32EaE4',
    '0xc1879bf24917ebE531FbAA20b0D05Da027B592ce',
    '0x9617b633EF905860D919b88E1d9d9a6191795341',
    '0xCfc571f3203756319c231d3Bc643Cee807E74636',
    '0x3410297D89dCDAf4072B805EFc1ef701Bb3dd9BF',
    '0x257101F20cB7243E2c7129773eD5dBBcef8B34E0',
    '0x390Db10e65b5ab920C19149C919D970ad9d18A41',
    '0x5ec47EE69BEde0b6C2A2fC0D9d094dF16C192498',
    '0xd31E19A0574dBF09310c3B06f3416661B4Dc7324',
    '0xc6B2b3fE7c3D7a6f823D9106E22e66660709001e',
    '0x53375adD9D2dFE19398eD65BAaEFfe622760A9A6',
    '0x8227965A7f42956549aFaEc319F4E444aa438Df5',
  ],
  avax: [
    '0x3CFEd0439aB822530b1fFBd19536d897EF30D2a2',
    '0x3b63f81Ad1fc724E44330b4cf5b5B6e355AD964B',
    '0x95cCe62C3eCD9A33090bBf8a9eAC50b699B54210',
    '0x35fA7A723B3B39f15623Ff1Eb26D8701E7D6bB21',
    '0x0a1e6a80E93e62Bd0D3D3BFcF4c362C40FB1cF3D',
    '0x2450Bf8e625e98e14884355205af6F97E3E68d07',
    '0xAcc6821d0F368b02d223158F8aDA4824dA9f28E3',
  ],
  fantom: [
    '0x7208d9F9398D7b02C5C22c334c2a7A3A98c0A45d',
    '0x4fdfFa59bf8dda3F4d5b38F260EAb8BFaC6d7bC1',
    '0x8E45Af6743422e488aFAcDad842cE75A09eaEd34',
    '0xd4357d43545F793101b592bACaB89943DC89d11b',
    '0xed745b045f9495B8bfC7b58eeA8E0d0597884e12',
    '0xa3Fc1B4b7f06c2391f7AD7D4795C1cD28A59917e',
  ],
}

const getContracts = async () => {
  const [mStakeContracts_Eth, mStakeContracts_Avax, mStakeContracts_Fantom] = await Promise.all([
    getMStakeContract('ethereum', mSPELL_Eth),
    getMStakeContract('avax', mSPELL_Avax),
    getMStakeContract('fantom', mSPELL_Fantom),
  ])

  const sStakeContracts_Eth = await getSStakeContract('ethereum', sSPELL_Eth)

  const [marketsContracts_Eth, marketsContracts_Avax, marketsContracts_Fantom] = await Promise.all([
    getMarketsContracts('ethereum', Cauldron.ethereum),
    getMarketsContracts('avax', Cauldron.avax),
    getMarketsContracts('fantom', Cauldron.fantom),
  ])

  return {
    contracts: {
      ...ethereumContracts.contracts,
      ...avaxContracts.contracts,
      ...fantomContracts.contracts,
    },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  {
    mStakeContracts_Eth,
    mStakeContracts_Avax,
    mStakeContracts_Fantom,
    sStakeContracts_Eth,
    marketsContracts_Eth,
    marketsContracts_Avax,
    marketsContracts_Fantom,
  },
) => {
  const [mStakeBalances_Eth, mStakeBalances_Avax, mStakeBalances_Fantom] = await Promise.all([
    getMStakeBalance(ctx, 'ethereum', mStakeContracts_Eth || []),
    getMStakeBalance(ctx, 'avax', mStakeContracts_Avax || []),
    getMStakeBalance(ctx, 'fantom', mStakeContracts_Fantom || []),
  ])

  const sStakeBalances_Eth = await getSStakeBalance(ctx, 'ethereum', sStakeContracts_Eth || [])

  const [marketsBalances_Eth, marketsBalances_Avax, marketsBalances_Fantom] = await Promise.all([
    getMarketsBalances(ctx, 'ethereum', marketsContracts_Eth || []),
    getMarketsBalances(ctx, 'avax', marketsContracts_Avax || []),
    getMarketsBalances(ctx, 'fantom', marketsContracts_Fantom || []),
  ])

  const balances = [
    ...mStakeBalances_Eth,
    ...mStakeBalances_Avax,
    ...mStakeBalances_Fantom,
    ...sStakeBalances_Eth,
    ...marketsBalances_Eth,
    ...marketsBalances_Avax,
    ...marketsBalances_Fantom,
  ]

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'abracadabra',
  getContracts,
  getBalances,
}

export default adapter
