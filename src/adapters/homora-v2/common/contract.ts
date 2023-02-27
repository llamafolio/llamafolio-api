import { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  cToken: {
    inputs: [],
    name: 'cToken',
    outputs: [{ internalType: 'contract ICErc20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlying: {
    constant: true,
    inputs: [],
    name: 'underlying',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  exchangeRateCurrent: {
    constant: false,
    inputs: [],
    name: 'exchangeRateCurrent',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
}

export async function getPoolsContract(ctx: BaseContext, pools: string[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const cTokensRes = await multicall({ ctx, calls: pools.map((pool) => ({ target: pool })), abi: abi.cToken })

  const underlyingsTokens = await multicall({
    ctx,
    calls: cTokensRes.map((res) => (isSuccess(res) ? { target: res.output } : null)),
    abi: abi.underlying,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyingRes = underlyingsTokens[poolIdx]

    if (!isSuccess(underlyingRes)) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: pool,
      cToken: underlyingRes.input.target,
      underlyings: [underlyingRes.output],
    })
  }

  return contracts
}
