import {
  getAbracadabraFarmerContracts,
  getAbracadabraMasterChefBalances,
} from '@adapters/abracadabra/common/masterchef'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getMarketsBalances, getMarketsContracts } from '../common/markets'
import { getMStakeBalance, getMStakeContract } from '../common/mStake'
import { getSStakeBalance, getSStakeContract } from '../common/sStake'

const mSPELL: Contract = {
  name: 'mSpellStaking',
  chain: 'ethereum',
  address: '0xbD2fBaf2dc95bD78Cf1cD3c5235B33D1165E6797',
  decimals: 18,
  symbol: 'mSPELL',
}

const sSPELL: Contract = {
  name: 'sSpellStaking',
  chain: 'ethereum',
  address: '0x26fa3fffb6efe8c1e69103acb4044c26b9a106a9',
  decimals: 18,
  symbol: 'sSPELL',
}

const MIM: Contract = {
  name: 'Magic Internet Money',
  address: '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3',
  chain: 'ethereum',
  symbol: 'MIM',
  decimals: 18,
  coingeckoId: 'magic-internet-money',
  stable: true,
  wallet: true,
}

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0xf43480afe9863da4acbd4419a47d9cc7d25a647f',
}

const metaRegistry: Contract = {
  name: 'Curve Metaregistry',
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

const cauldrons: `0x${string}`[] = [
  //  Active v2
  '0x7b7473a76D6ae86CE19f7352A1E89F6C9dc39020', // ALCX
  '0xc1879bf24917ebE531FbAA20b0D05Da027B592ce', // AGLD
  '0x252dCf1B621Cc53bc22C256255d2bE5C8c32EaE4', // SHIB
  '0xCfc571f3203756319c231d3Bc643Cee807E74636', // SPELL
  '0x3410297D89dCDAf4072B805EFc1ef701Bb3dd9BF', // sSPELL
  '0x5ec47EE69BEde0b6C2A2fC0D9d094dF16C192498', // WBTC
  '0x390Db10e65b5ab920C19149C919D970ad9d18A41', // WETH
  '0x257101F20cB7243E2c7129773eD5dBBcef8B34E0', // cvx3pool
  '0x4EAeD76C3A388f4a841E9c765560BBe7B3E4B3A0', // cvxTriCrypto2
  '0x98a84EfF6e008c5ed0289655CcdCa899bcb6B99F', // xSUSHI
  '0xf179fe36a36B32a4644587B8cdee7A23af98ed37', // yvCVXETH
  '0x920d9bd936da4eafb5e25c6bdc9f6cb528953f9f', // yvWETHv2
  '0xEBfDe87310dc22404d918058FAa4D56DC4E93f0A', // yvCRVIB
  //  Active v3
  '0x8227965A7f42956549aFaEc319F4E444aa438Df5', // LUSD(V3-2)
  '0xd31E19A0574dBF09310c3B06f3416661B4Dc7324', // StargateUSDC
  '0xc6B2b3fE7c3D7a6f823D9106E22e66660709001e', // StargateUSDT
  '0x7Ce7D9ED62B9A6c5aCe1c6Ec9aeb115FA3064757', // yvDAI
  '0x53375adD9D2dFE19398eD65BAaEFfe622760A9A6', // yvstETH_Concentrated
  //  Active v4
  '0x207763511da879a900973A5E092382117C3c1588', // CRV
  '0x7d8df3e4d06b0e19960c19ee673c0823beb90815', // CRVv2
  '0x1062eb452f8c7a94276437ec1f4aaca9b1495b72', // StargateUSDT
  '0x7259e152103756e1616A77Ae982353c3751A6a90', // yCRV
  '0x692887E8877C6Dd31593cda44c382DB5b289B684', // magicAPE
  '0x406b89138782851d3a8c04c743b010ceb0374352', // ystETH
  '0x85f60D3ea4E86Af43c9D4E9CC9095281fC25c405', // wBTC
  //  Deprecated V1 but there is still residual liquidity
  '0x551a7CfF4de931F32893c928bBc3D25bF1Fc5147', // yvUSDTv2
  '0x6cbAFEE1FaB76cA5B5e144c43B3B50d42b7C8c8f', // yvUSDCv2
  '0xFFbF4892822e0d552CFF317F65e1eE7b5D3d9aE6', // yvYFI
  '0x6Ff9061bB8f97d948942cEF376d98b51fA38B91f', // yvWETH
  '0xbb02A884621FB8F5BFd263A67F58B65df5b090f3', // xSUSHI
  // Deprecated V2 but there is still residual liquidity
  '0x05500e2Ee779329698DF35760bEdcAAC046e7C27', // FTM
  '0x003d5A75d284824Af736df51933be522DE9Eed0f', // wsOHM
  '0xbc36FdE44A7FD8f545d459452EF9539d7A14dd63', // UST
  '0x59E9082E068Ddb27FC5eF1690F9a9f22B32e573f', // USDTv2
  '0x0BCa8ebcB26502b013493Bf8fE53aA2B1ED401C1', // yvstETH
  '0x806e16ec797c69afa8590A55723CE4CC1b54050E', // cvx3pool
  '0x6371EfE5CD6e3d2d7C477935b7669401143b7985', // cvx3poolv2
  '0xC319EEa1e792577C319723b5e60a15dA3857E7da', // sSPELL
  '0x9617b633EF905860D919b88E1d9d9a6191795341', // FTT
  '0x35a0Dd182E4bCa59d5931eae13D0A2332fA30321', // cvxRenCRV
]

export const getContracts = async (ctx: BaseContext) => {
  const [farmers, mStakeContracts, sStakeContracts, marketsContracts] = await Promise.all([
    getAbracadabraFarmerContracts(ctx, masterChef, metaRegistry),
    getMStakeContract(ctx, mSPELL),
    getSStakeContract(ctx, sSPELL),
    getMarketsContracts(ctx, cauldrons),
  ])

  return {
    contracts: {
      mStakeContracts,
      sStakeContracts,
      marketsContracts,
      farmers,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getMarketsBalances(ctx, contracts.marketsContracts || [], MIM),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      mStakeContracts: getMStakeBalance,
      sStakeContracts: getSStakeBalance,
      farmers: (...args) => getAbracadabraMasterChefBalances(...args, masterChef, metaRegistry),
    }),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}
