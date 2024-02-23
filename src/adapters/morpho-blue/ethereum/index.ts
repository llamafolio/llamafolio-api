import { getMorphoAssets } from '@adapters/morpho-blue/ethereum/asset'
import { getMorphoBalances } from '@adapters/morpho-blue/ethereum/balance'
import { getMorphoContracts } from '@adapters/morpho-blue/ethereum/contract'
import { getMorphoLendBalances } from '@adapters/morpho-blue/ethereum/lend'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolIds: `0x${string}`[] = [
  '0xc54d7acf14de29e0e5527cabd7a576506870346a78a11a6762e2cca66322ec41',
  '0x06f2842602373d247c4934f7656e513955ccc4c377f0febc0d9ca2c3bcc191b1',
  '0xf9acc677910cc17f650416a22e2a14d5da7ccb9626db18f1bf94efe64f92b372',
  '0x7dde86a1e94561d9690ec678db673c1a6396365f7d1d65e129c5fff0990ff758',
  '0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc',
  '0x495130878b7d2f1391e21589a8bcaef22cbc7e1fbbd6866127193b3cc239d8b1',
  '0x3a85e619751152991742810df6ec69ce473daef99e28a64ab2340d7b7ccfee49',
  '0xd5211d0e3f4a30d5c98653d988585792bb7812221f04801be73a44ceecb11e89',
  '0x698fe98247a40c5771537b5786b2f3f9d78eb487b4ce4d75533cd0e94d88a115',
  '0x608929d6de2a10bacf1046ff157ae38df5b9f466fb89413211efb8f63c63833a',
  '0xdbffac82c2dc7e8aa781bd05746530b0068d80929f23ac1628580e27810bc0c5',
  '0xa921ef34e2fc7a27ccc50ae7e4b154e16c9799d3387076c421423ef52ac4df99',
  '0xe7e9694b754c4d4f7e21faf7223f6fa71abaeb10296a4c43a54a7977149687d2',
  '0x124ddf1fa02a94085d1fcc35c46c7e180ddb8a0d3ec1181cf67a75341501c9e6',
  '0xc576cddfd1ee8332d683417548801d6835fa15fb2332a647452248987a8eded3',
  '0xae1839e7d779b32e91e2128405525b7f38478f38fed74b9a4795e8ed952592b7',
  '0xf213843ac8ce2c8408182fc80c9e8f9911b420cce24adec8ea105ae44de087ad',
  '0x3c83f77bde9541f8d3d82533b19bbc1f97eb2f1098bb991728acbfbede09cc5d',
  '0x9337a95dcb09d10abb33fdb955dd27b46e345f5510d54d9403f570f8f37b5983',
]

const rawComptroller: Contract = {
  chain: 'ethereum',
  address: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
  assets: [],
}

const bbUSDC: Contract = {
  chain: 'ethereum',
  address: '0x186514400e52270cef3d80e1c6f8d10a75d47344',
}

const steakUSDC: Contract = {
  chain: 'ethereum',
  address: '0xbeef01735c132ada46aa9aa4c54623caa92a64cb',
}

const bbETH: Contract = {
  chain: 'ethereum',
  address: '0x38989bba00bdf8181f4082995b3deae96163ac5d',
}

const bbUSDT: Contract = {
  chain: 'ethereum',
  address: '0x2c25f6c25770ffec5959d34b94bf898865e5d6b1',
}

const re7WETH: Contract = {
  chain: 'ethereum',
  address: '0x78fc2c2ed1a4cdb5402365934ae5648adad094d0',
}

const steakPYUSD: Contract = {
  chain: 'ethereum',
  address: '0xbeef02e5e13584ab96848af90261f0c8ee04722a',
}

const steakUSDT: Contract = {
  chain: 'ethereum',
  address: '0xbeef047a543e45807105e51a8bbefcc5950fcfba',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, comptroller] = await Promise.all([
    getMorphoContracts(ctx, [bbUSDC, steakUSDC, bbETH, bbUSDT, re7WETH, steakPYUSD, steakUSDT]),
    getMorphoAssets(ctx, rawComptroller, poolIds),
  ])

  return {
    contracts: { pools, comptroller },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balancesGroups, balances] = await Promise.all([
    getMorphoLendBalances(ctx, contracts.comptroller!),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: getMorphoBalances,
    }),
  ])

  return {
    groups: [...balancesGroups, { balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1705190400,
}
