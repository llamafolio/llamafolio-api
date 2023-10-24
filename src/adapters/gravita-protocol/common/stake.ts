import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  deposits: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'deposits',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getDepositorGains: {
    inputs: [
      { internalType: 'address', name: '_depositor', type: 'address' },
      { internalType: 'address[]', name: '_assets', type: 'address[]' },
    ],
    name: 'getDepositorGains',
    outputs: [
      { internalType: 'address[]', name: '', type: 'address[]' },
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const GRAI: { [key: string]: Token } = {
  ethereum: {
    chain: 'ethereum',
    address: '0x15f74458aE0bFdAA1a96CA1aa779D715Cc1Eefe4',
    decimals: 18,
    symbol: 'GRAI',
  },
  arbitrum: {
    chain: 'arbitrum',
    address: '0x894134a25a5faC1c2C26F1d8fBf05111a3CB9487',
    decimals: 18,
    symbol: 'GRAI',
  },
}

export async function getGravitaStakeBalance(
  ctx: BalancesContext,
  staker: Contract,
  assets: Contract[],
): Promise<Balance> {
  const [userDeposit, userPendingRewards] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.deposits }),
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: staker.address, params: [ctx.address, [asset.address]] }) as const),
      abi: abi.getDepositorGains,
    }),
  ])

  const rewards: any = mapSuccessFilter(userPendingRewards, (res, index) => {
    const [_token, balance] = res.output.flat()
    if (balance !== 0n) return { ...assets[index], amount: balance }
  })

  return { ...GRAI[ctx.chain], amount: userDeposit, underlyings: undefined, rewards, category: 'stake' }
}
