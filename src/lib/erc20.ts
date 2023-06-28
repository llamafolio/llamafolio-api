import type { Balance, BalancesContext, BaseContext } from '@lib/adapter'
import { sliceIntoChunks } from '@lib/array'
import { call } from '@lib/call'
import { type Chain, gasToken } from '@lib/chains'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { getTokenKey } from '@lib/price'
import { sleep } from '@lib/promise'
import { providers } from '@lib/providers'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { getToken } from '@llamafolio/tokens'
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

/**
 * Get ERC20 token balance of a a given wallet address
 * returns undefined if it fails
 */
export async function balanceOf({
  client,
  address: walletAddress,
  token,
}: {
  client: PublicClient
  chain: Chain
  address: Address
  token: Token
}): Promise<Balance | undefined> {
  try {
    const result = await readContract(client, {
      abi: ERC20_ABI,
      address: getAddress(token.address),
      functionName: 'balanceOf',
      args: [getAddress(walletAddress)],
    })
    if (!result || result === 0n) return undefined
    // @ts-ignore TODO: fix type
    return { ...token, amount: result }
  } catch {
    return undefined
  }
}

export async function balancesOf({
  address,
  tokens,
  chain,
  client,
}: {
  address: Address
  tokens: Array<Token>
  chain: Chain
  client: PublicClient
}): Promise<
  | {
      success: true
      result: Array<Balance>
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
      args: [address, tokens.map((token) => getAddress(token.address))],
    })

    const balances = [] as Array<Balance>

    for (const [index, balance] of results.entries()) {
      if (!balance || balance == 0n) continue
      const token = tokens[index]
      if (!token) continue
      const tokenBalance = {
        ...token,
        amount: balance,
      }
      //@ts-ignore TODO: fix this
      balances.push(tokenBalance as Balance)
    }
    if (!nativeResult || typeof nativeResult !== 'bigint') return { success: true, result: balances }
    const nativeToken = { ...gasToken[chain], amount: nativeResult }
    // @ts-ignore TODO: fix this

    return {
      success: true,
      // @ts-ignore TODO: fix this
      result: [nativeToken, ...balances],
    }
  } catch (error) {
    return {
      success: false,
      result: tokens,
    }
  }
}

export async function userBalances({
  client,
  chain,
  address: walletAddress,
  tokens,
  chunkSize,
}: {
  client: PublicClient
  chain: Chain
  address: Address
  tokens: Array<Token>
  chunkSize: number
}): Promise<{
  result: Array<Balance>
  rejected: Array<Token>
}> {
  const chunks = sliceIntoChunks(
    tokens.map((token) => ({
      ...token,
      priceId: getTokenKey(token),
    })),
    chunkSize,
  ) as Array<Array<Token>>

  const balancesResults = await Promise.allSettled(
    chunks.map(async (chunk, _index) => {
      const { success, result } = await balancesOf({ client, chain, address: walletAddress, tokens: chunk })
      sleep(1)
      return { success, result }
    }),
  )

  const balances = [] as Array<Balance>
  const natives = [] as Array<Balance>
  const rejected = [] as Array<Token>
  for (const [index, balancesResult] of balancesResults.entries()) {
    if (balancesResult.status === 'rejected') {
      rejected.push(...chunks[index])
      continue
    }

    if (balancesResult.status === 'fulfilled' && balancesResult.value.success === false) {
      rejected.push(...chunks[index])
      continue
    }
    if (balancesResult.status === 'fulfilled') {
      const {
        success,
        result: [nativeBalance, ...tokensBalances],
      } = balancesResult.value
      if (!success) continue
      // @ts-ignore TODO: fix this
      balances.push(...tokensBalances)
      // @ts-ignore TODO: fix this
      if (nativeBalance) natives.push(nativeBalance)
    }
  }

  return {
    result: [...natives.slice(0, 1), ...balances],
    rejected,
  }
}

export async function userBalancesWithRetry({
  address,
  chain,
  tokens,
}: {
  address: Address
  chain: Chain
  tokens: Array<Token>
}): Promise<{
  chain: Chain
  result: Array<Balance>
}> {
  const client = providers[chain]
  const { rejected, result } = await userBalances({
    client,
    chain,
    address,
    tokens,
    chunkSize: 500,
  })

  const retry = await Promise.all([
    ...rejected.map(async (token) => await balanceOf({ client, chain, address, token })),
  ])
  const successfulRetryResult = retry.filter((token) => !!token && !['0', 0n].includes(token.amount)) as Array<Balance>
  if (result.length === 0) {
    return {
      chain,
      result: [
        {
          ...gasToken[chain],
          priceId: getTokenKey(gasToken[chain]),
          amount: await client.getBalance({ address }),
        },
        ...successfulRetryResult,
      ],
    }
  }
  return {
    chain,
    result: [...result, ...successfulRetryResult],
  }
}

/**
 * @description Returns an object with the native chain token balance and an array of ERC20 token balances
 */
export async function getBalancesOf(
  ctx: BalancesContext,
  tokens: Token[],
): Promise<{
  coin: Balance
  erc20: Balance[]
}> {
  const erc20: Balance[] = []

  try {
    const [nativeBalance, ...multiBalances] = await call({
      ctx,
      target: multiCoinContracts[ctx.chain],
      abi: abi.balancesOf,
      params: [ctx.address, tokens.map((token) => token.address)],
    })

    // first token is native chain token (e.g. ETH, AVAX, etc.)
    const nativeTokenBalance: Balance = {
      amount: nativeBalance,
      ...gasToken[ctx.chain],
      category: 'wallet',
    } as Balance

    for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
      erc20.push({ ...tokens[tokenIdx], amount: multiBalances[tokenIdx] } as Balance)
    }

    return { coin: nativeTokenBalance, erc20 }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `Encoutered an error: ` + error
    console.error(`[getBalancesOf][${ctx.chain}] ${errorMessage}]`)
    throw new Error(errorMessage)
  }
}

export async function getERC20Details(ctx: BaseContext, tokens: readonly `0x${string}`[]): Promise<Token[]> {
  const found: { [key: string]: Token } = {}
  for (const address of tokens) {
    const tokenInfo = getToken(ctx.chain, address.toLowerCase())
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
      //@ts-ignore
      symbol: symbolRes.output,
      decimals: Number(decimalsRes.output),
    }
  }

  return tokens.map((address) => found[address]).filter(isNotNullish)
}
