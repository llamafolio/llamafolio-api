import { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { resolveERC20Details } from '@lib/erc20'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  getSets: {
    inputs: [],
    name: 'getSets',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getComponents: {
    inputs: [],
    name: 'getComponents',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getSetProtocolPools(ctx: BaseContext, controller: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const setsContractsRes = await call({ ctx, target: controller.address, params: [], abi: abi.getSets })

  const calls: Call[] = []
  for (let idx = 0; idx < setsContractsRes.output.length; idx++) {
    const setsContractRes = setsContractsRes.output[idx]
    calls.push({ target: setsContractRes, params: [] })

    pools.push({ chain: ctx.chain, address: setsContractRes, underlyings: [] })
  }

  const underlyingsRes = await multicall({ ctx, calls, abi: abi.getComponents })
  const underlyings: any = underlyingsRes.filter(isSuccess).map((res) => res.output)

  const underlyingsDetails = await resolveERC20Details(ctx, underlyings)

  for (let idx = 0; idx < pools.length; idx++) {
    const pool = pools[idx]
    const underlyingDetails = underlyingsDetails[idx]

    for (let underlyingIdx = 0; underlyingIdx < underlyingDetails.length; underlyingIdx++) {
      const underlying = underlyingDetails[underlyingIdx]

      if (!isSuccess(underlying)) {
        continue
      }

      pool.underlyings?.push(underlying.output as any)
    }
  }

  return pools
}
