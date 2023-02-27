import { BaseContext, Contract } from '@lib/adapter'
import { Call, multicall } from '@lib/multicall'
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

  const calls: Call[] = pools.map((pool) => ({ target: pool }))

  const cTokens = await multicall({ ctx, calls, abi: abi.cToken })

  const underlyingsCalls: Call[] = []
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const cToken = cTokens[poolIdx]

    if (!isSuccess(cToken)) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: pool,
      cToken: cToken.output,
    })

    underlyingsCalls.push({ target: cToken.output })
  }

  const underlyingsTokens = await multicall({ ctx, calls: underlyingsCalls, abi: abi.underlying })

  for (let idx = 0; idx < contracts.length; idx++) {
    const contract = contracts[idx]
    const underlyingsToken = underlyingsTokens[idx]

    if (!isSuccess(underlyingsToken)) {
      continue
    }

    contract.underlyings = [underlyingsToken.output]
  }

  return contracts
}
