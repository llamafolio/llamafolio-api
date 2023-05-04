import type { Balance, BalancesContext, BaseContext } from '@lib/adapter'
import type { Call, MultiCallResult } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { getToken } from '@llamafolio/tokens'
import { BigNumber } from 'ethers'

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
  getBalances: {
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
    name: 'getBalances',
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
}

// See: https://github.com/o-az/evm-balances/tree/master
const multiCoinContracts = {
  arbitrum: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  avalanche: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  bsc: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  ethereum: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  fantom: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  optimism: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  polygon: '0xE052Ef907f09c0053B237647aD7387D4BDF11A5A',
}

export interface GetERC20BalanceOfParams {
  getContractAddress: (contract: any) => string
}

export async function getERC20BalanceOf(
  ctx: BalancesContext,
  tokens: Token[],
  params?: GetERC20BalanceOfParams,
): Promise<Balance[]> {
  const { getContractAddress } = params || { getContractAddress: (contract) => contract.address }

  if (ctx.chain in multiCoinContracts) {
    const tokenByAddress: { [key: string]: Token } = {}
    let nextTokens = tokens.slice()

    for (let i = 0; i < tokens.length; i++) {
      tokenByAddress[tokens[i].address] = tokens[i]
    }

    do {
      // binary search to handle errors as the whole call will fail if one token fails
      const mid = Math.floor(nextTokens.length / 2)
      const left = nextTokens.slice(0, mid)
      const right = nextTokens.slice(mid)
      const slices = [left, right]

      const balances = await multicall({
        ctx,
        // @ts-ignore
        calls: slices.map((tokens) => ({
          // @ts-ignore
          target: multiCoinContracts[ctx.chain],
          params: [ctx.address, tokens.map((token) => token.address)],
        })),
        abi: abi.getBalances,
      })

      const failedTokens: Token[] = []
      for (const balancesRes of balances) {
        if (!balancesRes.success || balancesRes.output == null) {
          // Found error
          if (balancesRes.input.params[1].length === 1) {
            console.error(`Could not get balanceOf for token ${balancesRes.input.params[1][0]}`)
            continue
          }

          for (let tokenIdx = 0; tokenIdx < balancesRes.input.params[1].length; tokenIdx++) {
            const tokenAddress = balancesRes.input.params[1][tokenIdx]
            failedTokens.push(tokenByAddress[tokenAddress])
          }
        } else {
          for (let tokenIdx = 0; tokenIdx < balancesRes.input.params[1].length; tokenIdx++) {
            const tokenAddress = balancesRes.input.params[1][tokenIdx]
            const token = tokenByAddress[tokenAddress]
            if (token) {
              ;(token as any).amount = BigNumber.from(balancesRes.output[tokenIdx] || '0')
            }
          }
        }
      }

      nextTokens = failedTokens.slice()
    } while (nextTokens.length > 0)

    return tokens.filter((token) => (token as Balance).amount != null) as Balance[]
  }

  const balances = await multicall({
    ctx,
    calls: tokens.map((token) => ({
      target: getContractAddress(token),
      params: [ctx.address],
    })),
    abi: abi.balanceOf,
  })

  return tokens
    .map((token, i) => {
      if (!balances[i].success || balances[i].output == null) {
        console.error(`Could not get balanceOf for token ${ctx.chain}:${token.address}`)
        return null
      }

      ;(token as Balance).amount = BigNumber.from(balances[i].output || '0')
      return token as Balance
    })
    .filter(isNotNullish)
}

export async function getERC20Details(ctx: BaseContext, tokens: string[]): Promise<Token[]> {
  const found: { [key: string]: Token } = {}
  for (const address of tokens) {
    const tokenInfo = getToken(ctx.chain, address.toLowerCase())
    if (tokenInfo) {
      found[address] = tokenInfo as Token
    }
  }

  const missingTokens = tokens.filter((address) => !found[address])

  const calls = missingTokens.map((address) => ({
    target: address,
    params: [],
  }))

  const [symbols, decimals] = await Promise.all([
    multicall({ ctx, calls, abi: abi.symbol }),
    multicall({ ctx, calls, abi: abi.decimals }),
  ])

  for (let i = 0; i < missingTokens.length; i++) {
    const address = missingTokens[i]
    if (!symbols[i].success) {
      console.error(`Could not get symbol for token ${ctx.chain}:${address}`)
      continue
    }
    if (!decimals[i].success) {
      console.error(`Could not get decimals for token ${ctx.chain}:${address}`)
      continue
    }

    found[address] = {
      chain: ctx.chain,
      address,
      symbol: symbols[i].output,
      decimals: parseInt(decimals[i].output),
    }
  }

  return tokens.map((address) => found[address]).filter(isNotNullish)
}

export async function resolveERC20Details<K extends string>(
  ctx: BaseContext,
  contracts: Record<K, (string | null)[]>,
): Promise<Record<K, MultiCallResult<string | null, any[], Token | null>[]>> {
  const results = {} as Record<K, MultiCallResult<string | null, any[], Token | null>[]>
  const calls: Call[] = []

  for (const key in contracts) {
    results[key] = []

    for (let i = 0; i < contracts[key].length; i++) {
      const address = contracts[key][i]
      const input = { params: [], target: address }

      if (!address) {
        results[key].push({ success: false, output: null, input })
        continue
      }

      const token = getToken(ctx.chain, address.toLowerCase())

      if (token) {
        results[key].push({ success: true, output: token as Token, input })
      } else {
        calls.push({
          target: address,
          params: [],
        })
        results[key].push({ success: false, output: null, input })
      }
    }
  }

  // fetch missing info on-chain
  const [symbols, decimals] = await Promise.all([
    multicall({ ctx, calls, abi: abi.symbol }),
    multicall({ ctx, calls, abi: abi.decimals }),
  ])

  let callsIdx = 0
  for (const key in contracts) {
    for (let i = 0; i < contracts[key].length; i++) {
      // ignored nullish targets or successful responses (found in cache)
      if (!contracts[key][i] || results[key][i].success) {
        continue
      }

      const address = calls[callsIdx].target as string
      if (!symbols[callsIdx].success) {
        console.error(`Could not get symbol for token ${ctx.chain}:${address}`)
        callsIdx++
        continue
      }
      if (!decimals[callsIdx].success) {
        console.error(`Could not get decimals for token ${ctx.chain}:${address}`)
        callsIdx++
        continue
      }

      const token = {
        chain: ctx.chain,
        address,
        symbol: symbols[callsIdx].output,
        decimals: parseInt(decimals[callsIdx].output),
      } satisfies Token
      results[key][i].success = true
      results[key][i].output = token

      callsIdx++
    }
  }

  return results
}
