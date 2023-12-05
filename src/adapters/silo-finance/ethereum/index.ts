import { getSiloBalances } from '@adapters/silo-finance/common/balance'
import { getSiloPools } from '@adapters/silo-finance/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'

const siloVaults: `0x${string}`[] = [
  '0x96efdf95cc47fe90e8f63d2f5ef9fb8b180daeb9',
  '0x6543ee07cf5dd7ad17aeecf22ba75860ef3bbaaa',
  '0xdc4c07cdcb0fc4a6d6446c789f9b734e22a7391a',
  '0xfccc27aabd0ab7a0b2ad2b7760037b1eab61616b',
  '0x4f5717f1efdec78a960f08871903b394e7ea95ed',
  '0x2eaf84b425822edf450fc5fdeec085f2e5ada98b',
  '0x2c2a3abba45bf2d52ceb0eb3a55a4e354f986901',
  '0xb0823c25cdf531a58e581ee14f160c290fef5722',
  '0xb1590d554dc7d66f710369983b46a5905ad34c8c',
  '0xbc6594df90ddeada7cdd70dbc08e221a77512deb',
  '0xcb3b879ab11f825885d5add8bf3672596d35197c',
  '0xc8cd77d4cd9511f2822f24ad14fe9e3c97c57836',
  '0xac3333401e69574d433307b31f43a7826eb6f8fd',
  '0xa0460fceb47886920aad8a87b627f3890793d1a6',
  '0xcd888c9bd53c1ca49b9251f74cc93c73e22963fa',
  '0xc413dd03555f3eb29d834b482d386b2999dc2eb0',
  '0xaa7103f98e57c63e1bc7a9479c8c025adff9f71d',
  '0xf5ffabab8f9a6f4f6de1f0dd6e0820f68657d7db',
  '0x339666a930fd79c190e824dd9d9df0393b8bd196',
  '0x71d11118f64536a1722e86e3d0815556169ceca8',
  '0x31f3b3b86a074e2ffc4fd75d8eb9721a75ee04dc',
  '0x63e5d6cc84ed2a6336b2a06fb5b4318f70f14b45',
  '0x629b9e70a7d32c718318d691dda5da585e468b82',
  '0x92e7e77163ffed918421e3cb6e0a22f2fe8b37fa',
  '0xa104f14aeeb9b7246367d6a6e1f4e2c61a70e5d3',
  '0x74a633b156b55711d0c91e64fa7de3b7af87470a',
  '0x0a898eba24e6d1213f1e494d49e757640628aeec',
  '0x67cdb77c6c641f9881cdce6a9e223411fefd507c',
  '0x67b2d089c39c59a49f8fbdea43f5878b3a3f65c3',
  '0xe7f63c75abc21e43c7bd83aa338bfb58ff7a7178',
  '0xc9ae642d3a2792c429219ba641c4a2a8fb8f7dc5',
  '0x7a0e248e1ae9a042e5fbc7dabdbbdf1bf738b07f',
  '0xf60535db51e4639e0d23e4a3c2ba60194bf0f426',
  '0x463c0b5e3f52ab27ffe02c23e803903e5e5b361f',
  '0x58f93cb4ef4e3428066c848ec4d054edd68441af',
  '0x6926e507339eca2b01bede825d762f4ea19e13c2',
  '0x3876ca746cc3b25f304f8da8f9f80c220c99d750',
  '0xaeafe7ba306ca37cb7c69f6a2822541a28c116e8',
  '0x0bce613ef6a197e8c56be525cf173c27b49ac47d',
]

const rawRouters: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xb2374f84b3cEeFF6492943Df613C9BcF45322a0c',
  },
  {
    chain: 'ethereum',
    address: '0x8658047e48cc09161f4152c79155dac1d710ff0a',
  },
]

const legacylens: Contract = {
  chain: 'ethereum',
  address: '0xf12C3758c1eC393704f0Db8537ef7F57368D92Ea',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSiloPools(ctx, siloVaults)
  const routers: Contract[] = rawRouters.map((router) => ({ ...router, underlyings: pools }))

  return {
    contracts: {
      routers,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await getSiloBalances(ctx, contracts.routers || [], legacylens)

  return {
    groups: [...balances],
  }
}
