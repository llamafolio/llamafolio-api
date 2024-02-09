import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import type { Chain } from '@lib/chains'
import { type Call, multicall } from '@lib/multicall'
import { retrieveToken, type Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import type { Address } from 'viem'

export const abi = {
  balanceOf: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  decimals: {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        name: '',
        type: 'uint8',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  name: {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [
      {
        name: '',
        type: 'string',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  symbol: {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        name: '',
        type: 'string',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export interface TokenBalance {
  chain: Chain
  address: Address
  name: string
  symbol: string
  decimals: number
  amount: bigint
}

/**
 * @description Returns given contracts with their ERC20 token balances
 */
export async function getBalancesOf(
  ctx: BalancesContext,
  contracts: Contract[],
  params = { getAddress: (contract: Contract) => contract.token },
): Promise<Balance[]> {
  const balancesOf = await multicall({
    ctx,
    calls: contracts.map(
      (contract) => ({ target: params.getAddress(contract) || contract.address, params: [ctx.address] }) as const,
    ),
    abi: abi.balanceOf,
  })

  return mapSuccessFilter(balancesOf, (res, idx) => ({ ...contracts[idx], amount: res.output })) as Balance[]
}

export async function getERC20Details(ctx: BaseContext, tokens: readonly `0x${string}`[]): Promise<Token[]> {
  const found: { [key: string]: Token } = {}
  for (const address of tokens) {
    const tokenInfo = retrieveToken(ctx.chain, address.toLowerCase())
    if (tokenInfo) {
      found[address] = tokenInfo as Token
    }
  }

  const missingTokens = tokens.filter((address) => !found[address])

  const calls: Call<typeof abi.symbol>[] = missingTokens.map((address) => ({ target: address }))

  const [symbols, decimals] = await Promise.all([
    multicall({ ctx, calls, abi: abi.symbol }),
    multicall({ ctx, calls, abi: abi.decimals }),
  ])

  for (let i = 0; i < missingTokens.length; i++) {
    const address = missingTokens[i]
    const symbolRes = symbols[i]
    const decimalsRes = decimals[i]

    if (!symbolRes.success) {
      console.error(`Could not get symbol for token ${ctx.chain}:${address}`)
      continue
    }
    if (!decimalsRes.success) {
      console.error(`Could not get decimals for token ${ctx.chain}:${address}`)
      continue
    }

    found[address] = {
      chain: ctx.chain,
      address,
      symbol: symbolRes.output,
      decimals: Number(decimalsRes.output),
    }
  }

  return tokens.map((address) => found[address]).filter(isNotNullish)
}

export async function getTokenDetails(ctx: BaseContext, tokens: readonly `0x${string}`[]) {
  const found: { [key: string]: Partial<Token> } = {}
  for (const address of tokens) {
    const tokenInfo = retrieveToken(ctx.chain, address.toLowerCase())
    if (tokenInfo) {
      found[address] = tokenInfo as Token
    }
  }

  const missingTokens = tokens.filter((address) => !found[address])

  const calls: Call<typeof abi.symbol>[] = missingTokens.map((address) => ({ target: address }))

  const [symbols, decimals, names] = await Promise.all([
    multicall({ ctx, calls, abi: abi.symbol }),
    multicall({ ctx, calls, abi: abi.decimals }),
    multicall({ ctx, calls, abi: abi.name }),
  ])

  for (let i = 0; i < missingTokens.length; i++) {
    const address = missingTokens[i]
    const symbolRes = symbols[i]
    const decimalsRes = decimals[i]
    const nameRes = names[i]

    found[address] = {
      chain: ctx.chain,
      address,
      symbol: symbolRes.output || undefined,
      decimals: decimalsRes.output || undefined,
      name: nameRes.output || undefined,
    }
  }

  return tokens.map((address) => found[address]).filter(isNotNullish)
}
