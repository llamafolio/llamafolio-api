import type { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'

const abi = {
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ETH: { [key: string]: `0x${string}`[] } = {
  arbitrum: ['0x82cbecf39bee528b5476fe6d1550af59a9db6fc0', '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'],
  base: ['0x224d8fd7ab6ad4c6eb4611ce56ef35dec2277f03', '0x4200000000000000000000000000000000000006'],
  ethereum: ['0x72E2F4830b9E45d52F80aC08CB2bEC0FeF72eD9c', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
  optimism: ['0xb69c8cbcd90a39d8d3d3ccf0a3e968511c3856a0', '0x4200000000000000000000000000000000000006'],
}

export async function getStargateLpContracts(ctx: BaseContext, lpStakers: Contract[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const underlyingsRes = await multicall({
    ctx,
    calls: lpStakers.map((lpStaker) => ({ target: lpStaker.address })),
    abi: abi.token,
  })

  for (let stakerIdx = 0; stakerIdx < lpStakers.length; stakerIdx++) {
    const lpStaker = lpStakers[stakerIdx]
    const underlyingRes = underlyingsRes[stakerIdx]

    if (!underlyingRes.success) {
      continue
    }

    // replace SGETH to WETH
    const fmtUnderlyings =
      ctx.chain === 'polygon' || ctx.chain === 'fantom' || ctx.chain === 'avalanche' || ctx.chain === 'bsc'
        ? underlyingRes.output
        : ETH[ctx.chain][0].toLowerCase() === underlyingRes.output.toLowerCase()
        ? ETH[ctx.chain][1]
        : underlyingRes.output

    contracts.push({ ...lpStaker, underlyings: [fmtUnderlyings] })
  }

  return contracts
}
