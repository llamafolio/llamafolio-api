import { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
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

    if (!isSuccess(underlyingRes)) {
      continue
    }

    contracts.push({ ...lpStaker, underlyings: [underlyingRes.output] })
  }

  return contracts
}
