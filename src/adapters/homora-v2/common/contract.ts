import { BaseContext, Contract } from '@lib/adapter'
import { mapSuccess, mapSuccessOr } from '@lib/array'
import { multicall } from '@lib/multicall'

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
  const cTokensRes = await multicall({ ctx, calls: pools.map((pool) => ({ target: pool })), abi: abi.cToken })

  const underlyingsTokens = await multicall({
    ctx,
    calls: mapSuccessOr(cTokensRes, (res) => ({ target: res.output })),
    abi: abi.underlying,
  })

  return mapSuccess(underlyingsTokens, (underlyingRes, poolIdx) => ({
    chain: ctx.chain,
    address: pools[poolIdx],
    cToken: underlyingRes.input.target,
    underlyings: [underlyingRes.output],
  }))
}
