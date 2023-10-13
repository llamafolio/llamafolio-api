import type { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, sliceIntoChunks } from '@lib/array'
import { chainById, type Chain } from '@lib/chains'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { sleep } from '@lib/promise'
import { providers } from '@lib/providers'
import { retrieveToken } from '@lib/token'
import { isNotFalsy, isNotNullish } from '@lib/type'
import type { Token } from '@llamafolio/tokens'
import type { Address, PublicClient } from 'viem'
import { getAddress } from 'viem'
import { readContract } from 'viem/contract'

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
  balancesOf: {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        internalType: 'address[]',
        name: 'tokens',
        type: 'address[]',
      },
    ],
    name: 'balancesOf',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const BALANCES_OF_ABI = <const>[
  {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        internalType: 'address[]',
        name: 'tokens',
        type: 'address[]',
      },
    ],
    name: 'balancesOf',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]

export const ERC20_ABI = <const>[
  {
    inputs: [
      { internalType: 'string', name: 'name_', type: 'string' },
      { internalType: 'string', name: 'symbol_', type: 'string' },
      { internalType: 'uint8', name: 'decimals_', type: 'uint8' },
      { internalType: 'uint256', name: 'initialBalance_', type: 'uint256' },
      { internalType: 'address payable', name: 'feeReceiver_', type: 'address' },
    ],
    stateMutability: 'payable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'spender', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'subtractedValue', type: 'uint256' },
    ],
    name: 'decreaseAllowance',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'addedValue', type: 'uint256' },
    ],
    name: 'increaseAllowance',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'sender', type: 'address' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

/** @see: https://github.com/o-az/evm-balances/tree/main */
const multiCoinContracts = {
  ethereum: '0x13675852Ac733AEd5679985778BE5c18E64E97FA',
  arbitrum: '0x77e883446e4cDE8955b4ce07DfCf0E9887B0e66c',
  optimism: '0xc9bA77C9b27481B6789840A7C3128D4f691f8296',
  polygon: '0x8b08FE6F8443f7bBbEde50Ecc8B020d9e44997a2',
  celo: '0x5D88da6682B9088B9e31c900Be850de20cF20B11',
  gnosis: '0x5D88da6682B9088B9e31c900Be850de20cF20B11',
  harmony: '0xc9bA77C9b27481B6789840A7C3128D4f691f8296',
  moonbeam: '0x5D88da6682B9088B9e31c900Be850de20cF20B11',
  avalanche: '0xc9bA77C9b27481B6789840A7C3128D4f691f8296',
  fantom: '0xc9bA77C9b27481B6789840A7C3128D4f691f8296',
  bsc: '0xc9bA77C9b27481B6789840A7C3128D4f691f8296',
  /** Not yet supported */
  // aurora: '0xc9bA77C9b27481B6789840A7C3128D4f691f8296',
} satisfies { [key in Chain]: `0x${string}` }

export interface TokenBalance {
  chain: Chain
  address: Address
  name: string
  symbol: string
  decimals: number
  amount: bigint
}

/* The basic ERC20 `balanceOf` function. Returns `undefined` if the balance is 0. */
export async function balanceOf({
  client,
  chain,
  walletAddress,
  token,
}: {
  client: PublicClient
  chain: Chain
  walletAddress: Address
  token: Token
}): Promise<TokenBalance> {
  try {
    const result = await readContract(client, {
      abi: ERC20_ABI,
      address: getAddress(token.address),
      functionName: 'balanceOf',
      args: [getAddress(walletAddress)],
    })
    return { ...token, amount: result, chain }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    console.error(`[balanceOf()] ${errorMessage}`)
    throw errorMessage
  }
}

/**
 * Checks if the token is supported by the multi-coin contract. Balances of 0 are not returned.
 * On success, returns token balances array.
 * On failure, returns the token that failed.
 */
export async function balancesOf({
  client,
  chain,
  walletAddress,
  tokens,
}: {
  client: PublicClient
  chain: Chain
  walletAddress: Address
  tokens: Array<Token>
}): Promise<
  | {
      success: true
      result: Array<TokenBalance>
    }
  | {
      success: false
      result: Array<Token>
    }
> {
  try {
    const [nativeResult, ...results] = await readContract(client, {
      abi: BALANCES_OF_ABI,
      address: multiCoinContracts[chain],
      functionName: 'balancesOf',
      args: [getAddress(walletAddress), tokens.map((token) => token.address)],
    })

    const balances: Array<TokenBalance> = []

    for (const [index, balance] of results.entries()) {
      if (!balance || balance == 0n) continue
      const token = tokens[index]
      if (!token) continue
      balances.push(Object.assign({}, token, { amount: balance, chain }))
    }
    if (typeof nativeResult !== 'bigint') return { success: true, result: balances }
    return {
      success: true,
      result: [Object.assign({}, chainById[chain].nativeCurrency, { amount: nativeResult, chain }), ...balances],
    }
  } catch (error) {
    return { success: false, result: tokens }
  }
}

export async function userBalances({
  chain,
  walletAddress,
  tokens,
  chunkSize = 750,
}: {
  chain: Chain
  walletAddress: Address
  tokens: Array<Token>
  chunkSize?: number
}): Promise<Array<TokenBalance>> {
  const chunks = sliceIntoChunks(
    tokens.map((item) => Object.assign({}, item, { address: getAddress(item.address), chain })),
    chunkSize,
  )
  const client = providers[chain]

  const balancesResults = await Promise.allSettled(
    chunks.map(async (chunk) => {
      const result = await balancesOf({ client, chain, walletAddress, tokens: chunk })
      sleep(1)
      return result
    }),
  )

  const balances: Array<TokenBalance> = []
  const natives: Array<TokenBalance> = []
  const rejected: Array<Token> = []
  for (const [index, balancesResult] of balancesResults.entries()) {
    if (balancesResult.status !== 'fulfilled' || balancesResult.value.success != true) {
      rejected.push(...chunks[index])
      continue
    }

    const [nativeBalance, ...tokensBalances] = balancesResult.value.result
    balances.push(...tokensBalances)
    if (nativeBalance) natives.push(nativeBalance)
  }

  const retry = await Promise.all(rejected.map((token) => balanceOf({ client, chain, walletAddress, token })))
  const filteredRetry = retry.filter((token) => isNotFalsy(token.amount))

  if (natives.length === 0) {
    return [
      Object.assign({}, chainById[chain].nativeCurrency, {
        chain,
        amount: await client.getBalance({ address: walletAddress }),
      }),
      ...balances,
      ...filteredRetry,
    ]
  }
  return [natives[0], ...balances, ...filteredRetry]
}

/**
 * @description Returns given contracts with their ERC20 token balances
 */
export async function getBalancesOf(
  ctx: BalancesContext,
  contracts: Contract[],
  params = { getAddress: (contract: Contract) => contract.token },
) {
  const balancesOf = await multicall({
    ctx,
    calls: contracts.map(
      (contract) => ({ target: params.getAddress(contract) || contract.address, params: [ctx.address] }) as const,
    ),
    abi: abi.balanceOf,
  })

  return mapSuccessFilter(balancesOf, (res, idx) => ({ ...contracts[idx], amount: res.output }))
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
