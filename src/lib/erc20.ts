import type { Balance, BalancesContext, BaseContext } from '@lib/adapter'
import { call } from '@lib/call'
import type { Chain } from '@lib/chains'
import { ADDRESS_ZERO } from '@lib/contract'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { getToken } from '@llamafolio/tokens'

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

const networkToken = {
  arbitrum: ADDRESS_ZERO,
  avalanche: ADDRESS_ZERO,
  bsc: ADDRESS_ZERO,
  celo: '0x471ece3750da237f93b8e339c536989b8978a438',
  ethereum: ADDRESS_ZERO,
  fantom: ADDRESS_ZERO,
  harmony: ADDRESS_ZERO,
  polygon: ADDRESS_ZERO,
  moonbeam: ADDRESS_ZERO,
  optimism: ADDRESS_ZERO,
  gnosis: ADDRESS_ZERO,
} satisfies { [key in Chain]: `0x${string}` }

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
      ...getToken(ctx.chain, networkToken[ctx.chain]),
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
