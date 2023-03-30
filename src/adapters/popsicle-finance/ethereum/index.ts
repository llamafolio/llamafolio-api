import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

import { getPopsicleFarmBalances, getPopsicleFarmContracts } from '../common/farm'
import { getPopsicleYieldBalances } from '../common/yield'
import { getPopsicleStakeBalances } from './stake'

const yieldsPools: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xa7053782dC3523D2C82B439Acf3f9344Fb47b97f',
    pool: '0x3019D4e366576A88D28B623afAF3eCb9ec9d9580',
  },
  {
    chain: 'ethereum',
    address: '0xd2C5A739ebfE3E00CFa88A51749d367d7c496CCf',
    pool: '0xD8de6af55F618a7Bc69835D55DDC6582220c36c0',
  },
  {
    chain: 'ethereum',
    address: '0x949FDF28F437258E7564a35596b1A99b24F81e4e',
    pool: '0x3B685307C8611AFb2A9E83EBc8743dc20480716E',
  },
  {
    chain: 'ethereum',
    address: '0xa0273C10b8A4BF0bDC57cb0bC974E3A9d89527b8',
    pool: '0x2F62f2B4c5fcd7570a709DeC05D68EA19c82A9ec',
  },
  {
    chain: 'ethereum',
    address: '0x495410B129A27bC771ce8fb316d804a5686B8Ea7',
    pool: '0x5764a6f2212d502bc5970f9f129ffcd61e5d7563',
  },
  {
    chain: 'ethereum',
    address: '0x5C08A6762CAF9ec8a42F249eBC23aAE66097218D',
    pool: '0xFEbf38B1D34818D4827034f97b7D6D77c79D4997',
  },
  {
    chain: 'ethereum',
    address: '0xaE7b92C8B14E7bdB523408aE0A6fFbf3f589adD9',
    pool: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  },
  {
    chain: 'ethereum',
    address: '0x9683D433621A83aA7dd290106e1da85251317F55',
    pool: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
  },
  {
    chain: 'ethereum',
    address: '0x212Aa024E25A9C9bAF5b5397B558B7ccea81740B',
    pool: '0xcbcdf9626bc03e24f779434178a73a0b4bad62ed',
  },
  {
    chain: 'ethereum',
    address: '0xBE5d1d15617879B22C7b6a8e1e16aDD6d0bE3c61',
    pool: '0x4585fe77225b41b697c938b018e2ac67ac5a20c0',
  },
  {
    chain: 'ethereum',
    address: '0xFF338D347E59d6B61E5C69382915D863bb22Ef2f',
    pool: '0x36bcF57291a291a6E0E0bFF7B12B69B556BCd9ed',
  },
  {
    chain: 'ethereum',
    address: '0xa1BE64Bb138f2B6BCC2fBeCb14c3901b63943d0E',
    pool: '0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36',
  },
  {
    chain: 'ethereum',
    address: '0x8d8B490fCe6Ca1A31752E7cFAFa954Bf30eB7EE2',
    pool: '0x11b815efb8f581194ae79006d24e0d814b7697f6',
  },
  {
    chain: 'ethereum',
    address: '0xe2F04B543d9Fe57D2333d9827fdf188424b20623',
    pool: '0xe6E14be906c1F1b438DA2010B38bECa14b387231',
  },
  {
    chain: 'ethereum',
    address: '0x989442D5cCB27E7931095B0f3165c75a6def9bc3',
    pool: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C6',
  },
  {
    chain: 'ethereum',
    address: '0x71fd405e9C2f55522A73911b4A2F39CD80E06051',
    pool: '0x92995D179a5528334356cB4Dc5c6cbb1c068696C',
  },
  {
    chain: 'ethereum',
    address: '0xbA38029806AbE4B45D5273098137DDb52dA8e62F',
    pool: '0x868b7BBbFE148516E5397F23982923686182c2d2',
  },
  {
    chain: 'ethereum',
    address: '0xd2EF15af2649CC46e3E23B96563a3d44ef5E5A06',
    pool: '0x868b7BBbFE148516E5397F23982923686182c2d2',
  },
  {
    chain: 'ethereum',
    address: '0xF4f542E4b5E2345A1f2D0fEab9492357Ebc5c8f4',
    pool: '0x5b97B125CF8aF96834F2D08c8f1291BD47724939',
  },
  {
    chain: 'ethereum',
    address: '0x36e9B6e7FADC7b8Ee289c8A24Ad96573cda3D7D9',
    pool: '0x92560C178cE069CC014138eD3C2F5221Ba71f58a',
  },
]

const farmer: Contract = {
  chain: 'ethereum',
  address: '0xbf513ace2abdc69d38ee847effdaa1901808c31c',
  rewards: ['0xf16e81dce15B08F326220742020379B855B87DF9'],
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0xff3ac80c1caa08cbd43a7e90d20c398d54c7342f',
  symbol: 'nICE',
  decimals: 18,
}

export const getContracts = async (ctx: BaseContext) => {
  const [pairs, contracts] = await Promise.all([
    getPairsDetails(ctx, yieldsPools),
    getPopsicleFarmContracts(ctx, farmer),
  ])

  return {
    contracts: { pairs, contracts, staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPopsicleYieldBalances,
    contracts: getPopsicleFarmBalances,
    staker: getPopsicleStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
