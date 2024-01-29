import type { AdapterConfig } from "@lib/adapter";import { getStakewiseBalances } from '@adapters/stakewise/common/balance'
import { getStakeWiseLendBalances, getStakeWiseLendContracts } from '@adapters/stakewise/common/lend'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = [
  '0xac0f906e433d58fa868f936e8a43230473652885',
  '0xe6d8d8ac54461b1c5ed15740eee322043f696c08',
  '0x8a93a876912c9f03f88bc9114847cf5b63c89f56',
  '0x8216e50b1dd76faeb1ff4cafaba6790ea71910df',
  '0xb46dba422bcf7f113da2eeb41c0e2cc6298d6bba',
  '0x3f2f7424074bac9337ddca38e83e1518436e0ed0',
  '0xb36fc5e542cb4fc562a624912f55da2758998113',
  '0x907660805fb78ae4e8419f76537671cc4df2d4ab',
  '0x302be829c61c287787030888bbcf11115ecd5773',
  '0x96fb413349cb4ec17410df929898ae9c0e56ae40',
  '0x366e7f2e3462e31001560875b9877a0714e90d9c',
  '0x5610297eb32542b8f13378fe7d783dcb1ac3b1a1',
  '0x649955f4189c3921df60e25f58cb1e81070fedb0',
  '0xe2d8f982708ce1e3814c8986cbab624ca926288a',
  '0x26a9e35c54607af98998b9e9bf2e7b57615be24f',
  '0xea5e8e9732c79584c0980f2bd3c29d37c747969f',
  '0xea6db44b0d7e20f72f2b4b3deaaa9e710e718bd9',
  '0x99510bfc5d420cd3c41458f4692b1c3321908734',
  '0x089a97a8bc0c0f016f89f9cf42181ff06afb2daf',
  '0x06ec2d731b2fa8895e5a9482c22ee33573f44a13',
  '0xa40587e781bc31ffa2a0369edaaf7b8dcf1776d0',
  '0x740dff25651f1b1ac0b25ca947e9f166a06369a6',
  '0xd92d51c90632a7c49dc6fa90338f02eec9ba9db4',
]

const sEth2: Contract = {
  name: 'StakeWise Staked ETH2',
  chain: 'ethereum',
  address: '0xFe2e637202056d30016725477c5da089Ab0A043A',
  token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  rewards: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const rEth2: Contract = {
  chain: 'ethereum',
  address: '0x20bc832ca081b91433ff6c17f85701b6e92486c5',
}

export const getContracts = (ctx: BaseContext) => {
  const lenders: Contract[] = getStakeWiseLendContracts(ctx, poolAddresses)

  return {
    contracts: { sEth2, lenders },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balancesGroups, balances] = await Promise.all([
    getStakeWiseLendBalances(ctx, contracts.lenders || []),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      sEth2: (...args) => getStakewiseBalances(...args, rEth2),
    }),
  ])

  return {
    groups: [...balancesGroups, { balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1611702000,
                  }
                  