import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { BigNumber } from 'ethers'

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
}

interface BondParams extends Contract {
  bondWithToken: string
  bondAddress: string
}

export async function getBondsContracts(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const bondDetailsRes = await multicall({
    ctx,
    calls: range(0, 25).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: abi.bondDetails,
  })

  const bondContracts: BondParams[] = bondDetailsRes.filter(isSuccess).map((res) => ({
    chain: ctx.chain,
    address: res.output._principleToken,
    bondWithToken: res.output._payoutToken,
    bondAddress: res.output._bondAddress,
  }))

  return await getPairsDetails(ctx, bondContracts)
}

export async function getBondsBalances(ctx: BalancesContext, contracts: Contract[]) {
  const balances: Balance[] = []

  const calls = contracts.map((contract) => ({
    target: contract.address,
    params: [],
  }))

  const [pendingPayoutForRes, underlyingsTokensReservesRes, totalPoolSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({
        target: contract.bondAddress,
        params: [ctx.address],
      })),
      abi: abi.pendingPayoutFor,
    }),
    multicall({ ctx, calls, abi: abi.getReserves }),
    multicall({ ctx, calls, abi: abi.totalSupply }),
  ])

  const pendingPayoutFor = pendingPayoutForRes.filter(isSuccess).map((res) => BigNumber.from(res.output))
  const totalPoolSupplies = totalPoolSuppliesRes.filter(isSuccess).map((res) => BigNumber.from(res.output))

  const underlyingsTokensReserves0 = underlyingsTokensReservesRes
    .filter(isSuccess)
    .map((res) => BigNumber.from(res.output._reserve0))

  const underlyingsTokensReserves1 = underlyingsTokensReservesRes
    .filter(isSuccess)
    .map((res) => BigNumber.from(res.output._reserve1))

  for (let i = 0; i < underlyingsTokensReserves0.length; i++) {
    const contract = contracts[i]

    if (contract.underlyings) {
      const pendingPayout = pendingPayoutFor[i]
      const underlyingTokenReserves0 = underlyingsTokensReserves0[i]
      const underlyingTokenReserves1 = underlyingsTokensReserves1[i]
      const totalPoolSupply = totalPoolSupplies[i]

      const underlyingToken0 = {
        ...contract.underlyings[0],
        amount: pendingPayout.mul(underlyingTokenReserves0).div(totalPoolSupply),
      }

      const underlyingToken1 = {
        ...contract.underlyings[1],
        amount: pendingPayout.mul(underlyingTokenReserves1).div(totalPoolSupply),
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
