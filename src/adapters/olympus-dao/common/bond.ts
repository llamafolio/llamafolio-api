import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  bondDetails: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'bondDetails',
    outputs: [
      { internalType: 'address', name: '_payoutToken', type: 'address' },
      { internalType: 'address', name: '_principleToken', type: 'address' },
      { internalType: 'address', name: '_treasuryAddress', type: 'address' },
      { internalType: 'address', name: '_bondAddress', type: 'address' },
      { internalType: 'address', name: '_initialOwner', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingPayoutFor: {
    inputs: [{ internalType: 'address', name: '_depositor', type: 'address' }],
    name: 'pendingPayoutFor',
    outputs: [{ internalType: 'uint256', name: 'pendingPayout_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  token0: {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token1: {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getReserves: {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: '_reserve0', type: 'uint112' },
      { internalType: 'uint112', name: '_reserve1', type: 'uint112' },
      { internalType: 'uint32', name: '_blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface BondParams extends Contract {
  bondWithToken: `0x${string}`
  bondAddress: `0x${string}`
}

export async function getBondsContracts(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const bondDetailsRes = await multicall({
    ctx,
    calls: rangeBI(0n, 25n).map((i) => ({ target: contract.address, params: [i] } as const)),
    abi: abi.bondDetails,
  })

  const bondContracts: BondParams[] = mapSuccessFilter(bondDetailsRes, (res) => {
    const [_payoutToken, _principleToken, _treasuryAddress, _bondAddress] = res.output
    return {
      chain: ctx.chain,
      address: _principleToken,
      bondWithToken: _payoutToken,
      bondAddress: _bondAddress,
    }
  })

  return await getPairsDetails(ctx, bondContracts)
}

export async function getBondsBalances(ctx: BalancesContext, contracts: Contract[]) {
  const balances: Balance[] = []

  const calls: Call<typeof abi.getReserves>[] = contracts.map((contract) => ({
    target: contract.address,
  }))

  const [pendingPayoutForRes, underlyingsTokensReservesRes, totalPoolSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.bondAddress, params: [ctx.address] } as const)),
      abi: abi.pendingPayoutFor,
    }),
    multicall({ ctx, calls, abi: abi.getReserves }),
    multicall({ ctx, calls, abi: abi.totalSupply }),
  ])

  const pendingPayoutFor = mapSuccessFilter(pendingPayoutForRes, (res) => res.output)
  const totalPoolSupplies = mapSuccessFilter(totalPoolSuppliesRes, (res) => res.output)

  const underlyingsTokensReserves0 = mapSuccessFilter(underlyingsTokensReservesRes, (res) => {
    const [reserve0] = res.output
    return reserve0
  })

  const underlyingsTokensReserves1 = mapSuccessFilter(underlyingsTokensReservesRes, (res) => {
    const [_reserve0, reserve1] = res.output
    return reserve1
  })

  for (let i = 0; i < underlyingsTokensReserves0.length; i++) {
    const contract = contracts[i]

    if (contract.underlyings) {
      const pendingPayout = pendingPayoutFor[i]
      const underlyingTokenReserves0 = underlyingsTokensReserves0[i]
      const underlyingTokenReserves1 = underlyingsTokensReserves1[i]
      const totalPoolSupply = totalPoolSupplies[i]

      const underlyingToken0 = {
        ...contract.underlyings[0],
        amount: (pendingPayout * underlyingTokenReserves0) / totalPoolSupply,
      }

      const underlyingToken1 = {
        ...contract.underlyings[1],
        amount: (pendingPayout * underlyingTokenReserves1) / totalPoolSupply,
      }

      balances.push({
        ...contract,
        amount: pendingPayout,
        underlyings: [underlyingToken0, underlyingToken1],
        rewards: undefined,
        category: 'vest',
      })
    }
  }

  return balances
}
