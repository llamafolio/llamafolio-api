import { getSiloBalances } from '@adapters/silo-finance/common/balance'
import { getSiloPools } from '@adapters/silo-finance/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const siloVaults: `0x${string}`[] = [
  '0x6543ee07cf5dd7ad17aeecf22ba75860ef3bbaaa',
  '0xfccc27aabd0ab7a0b2ad2b7760037b1eab61616b',
  '0x4f5717f1efdec78a960f08871903b394e7ea95ed',
  '0x2eaf84b425822edf450fc5fdeec085f2e5ada98b',
  '0xb1590d554dc7d66f710369983b46a5905ad34c8c',
  '0xaa7103f98e57c63e1bc7a9479c8c025adff9f71d',
  '0xbc6594df90ddeada7cdd70dbc08e221a77512deb',
  '0xc413dd03555f3eb29d834b482d386b2999dc2eb0',
  '0xc8cd77d4cd9511f2822f24ad14fe9e3c97c57836',
  '0x67cdb77c6c641f9881cdce6a9e223411fefd507c',
  '0xf5ffabab8f9a6f4f6de1f0dd6e0820f68657d7db',
  '0xa0460fceb47886920aad8a87b627f3890793d1a6',
  '0xac3333401e69574d433307b31f43a7826eb6f8fd',
  '0xcb3b879ab11f825885d5add8bf3672596d35197c',
  '0xcd888c9bd53c1ca49b9251f74cc93c73e22963fa',
  '0x71d11118f64536a1722e86e3d0815556169ceca8',
  '0x63e5d6cc84ed2a6336b2a06fb5b4318f70f14b45',
  '0xf39f64d85ad89200e3b06c67f679c45798bf6a5b',
  '0x629b9e70a7d32c718318d691dda5da585e468b82',
  '0x92e7e77163ffed918421e3cb6e0a22f2fe8b37fa',
  '0xe7f63c75abc21e43c7bd83aa338bfb58ff7a7178',
  '0xa104f14aeeb9b7246367d6a6e1f4e2c61a70e5d3',
  '0x67b2d089c39c59a49f8fbdea43f5878b3a3f65c3',
  '0x31f3b3b86a074e2ffc4fd75d8eb9721a75ee04dc',
  '0x6c1603ab6cecf89dd60c24530dde23f97da3c229',
  '0xaeafe7ba306ca37cb7c69f6a2822541a28c116e8',
  '0xd953cc57d906e1f2d7d6c8c50a369ff64096ddc5',
  '0x7a0e248e1ae9a042e5fbc7dabdbbdf1bf738b07f',
  '0x58f93cb4ef4e3428066c848ec4d054edd68441af',
  '0x6926e507339eca2b01bede825d762f4ea19e13c2',
  '0x0bce613ef6a197e8c56be525cf173c27b49ac47d',
  '0x96efdf95cc47fe90e8f63d2f5ef9fb8b180daeb9',
]

const routers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xb2374f84b3cEeFF6492943Df613C9BcF45322a0c',
  },
  {
    chain: 'ethereum',
    address: '0x8658047e48cc09161f4152c79155dac1d710ff0a',
  },
]

const incentive: Contract = {
  chain: 'ethereum',
  address: '0x6c1603ab6cecf89dd60c24530dde23f97da3c229',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSiloPools(ctx, siloVaults)
  const fmtInteractions = routers.map((router) => ({ ...router, pools }))

  return {
    contracts: { pools, fmtInteractions },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    fmtInteractions: (...args) => getSiloBalances(...args, incentive),
  })

  return {
    groups: [{ balances }],
  }
}
