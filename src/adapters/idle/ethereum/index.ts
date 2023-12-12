import { getIdlePoolBalances, getIdlePoolContracts } from '@adapters/idle/common/pool'
import { getIdleTrancheBalances, getIdleTranchePools } from '@adapters/idle/common/tranche'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'

const IDLE: Contract = {
  chain: 'ethereum',
  address: '0x875773784Af8135eA0ef43b5a374AaD105c5D39e',
  decimals: 18,
  symbol: 'IDLE',
}

const CDOS: `0x${string}`[] = [
  '0x34dCd573C5dE4672C8248cd12A99f875Ca112Ad8',
  '0xF87ec7e1Ee467d7d78862089B92dd40497cBa5B8',
  '0x8E0A8A5c1e5B3ac0670Ea5a613bB15724D51Fc37',
  '0xDB82dDcb7e2E4ac3d13eBD1516CBfDb7b7CE0ffc',
  '0x9C13Ff045C0a994AF765585970A5818E1dB580F8',
  '0x440ceAd9C0A0f4ddA1C81b892BeDc9284Fc190dd',
  '0xb3F717a5064D2CBE1b8999Fdfd3F8f3DA98339a6',
  '0x5dca0b3ed7594a6613c1a2acd367d56e1f74f92d',
  '0x1329e8db9ed7a44726572d44729427f132fa290d',
  '0xE7C6A4525492395d65e736C3593aC933F33ee46e',
  '0xc4574C60a455655864aB80fa7638561A756C5E61',
]

const poolsAddresses: `0x${string}`[] = [
  '0xC8E6CA6E96a326dC448307A5fDE90a0b21fd7f80', // idleWETHYield
  '0x5C960a3DCC01BE8a0f49c02A8ceBCAcf5D07fABe', // idleRAIYield
  '0xb2d5CB72A621493fe83C6885E4A776279be595bC', // idleFEIYield
  '0x3fe7940616e5bc47b0775a0dccf6237893353bb4', // idleDAIYield
  '0x5274891bEC421B39D23760c04A6755eCB444797C', // idleUSDCYield
  '0xF34842d05A1c888Ca02769A633DF37177415C2f8', // idleUSDTYield
  '0xf52cdcd458bf455aed77751743180ec4a595fd3f', // idleSUSDYield
  '0xc278041fDD8249FE4c1Aad1193876857EEa3D68c', // idleTUSDYield
  '0x8C81121B15197fA0eEaEE1DC75533419DcfD3151', // idleWBTCYield
  '0xDc7777C771a6e4B3A82830781bDDe4DBC78f320e', // idleUSDCBB
  '0xfa3AfC9a194BaBD56e743fA3b7aA2CcbED3eAaad', // idleUSDTBB
  '0x78751b12da02728f467a44eac40f5cbc16bd7934', // idleDAIYieldV3
  '0x12B98C621E8754Ae70d0fDbBC73D6208bC3e3cA6', // idleUSDCYieldV3
  '0x63D27B3DA94A9E871222CB0A32232674B02D2f2D', // idleUSDTYieldV3
  '0xe79e177d2a5c7085027d7c64c8f271c81430fc9b', // idleSUSDYieldV3
  '0x51C77689A9c2e8cCBEcD4eC9770a1fA5fA83EeF1', // idleTUSDYieldV3
  '0xD6f279B7ccBCD70F8be439d25B9Df93AEb60eC55', // idleWBTCYieldV3
  '0x1846bdfDB6A0f5c473dEc610144513bd071999fB', // idleDAISafeV3
  '0xcDdB1Bceb7a1979C6caa0229820707429dd3Ec6C', // idleUSDCSafeV3
  '0x42740698959761baf1b06baa51efbd88cb1d862b', // idleUSDTSafeV3
  '0x28fAc5334C9f7262b3A3Fe707e250E01053e07b5', // idleUSDTSafe
  '0x3391bc034f2935ef0e1e41619445f998b2680d35', // idleUSDCSafe
  '0xa14ea0e11121e6e951e87c66afe460a00bcd6a16', // idleDAISafe
]

const locker: Contract = {
  chain: 'ethereum',
  address: '0xaac13a116ea7016689993193fce4badc8038136f',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, tranchePools] = await Promise.all([
    getIdlePoolContracts(ctx, poolsAddresses),
    getIdleTranchePools(ctx, CDOS),
  ])

  return {
    contracts: { tranchePools, pools, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    tranchePools: getIdleTrancheBalances,
    pools: getIdlePoolBalances,
    locker: (...args) => getSingleLockerBalance(...args, IDLE, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}
