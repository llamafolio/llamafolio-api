import type { BaseContext } from '@lib/adapter'
import { evmClient } from '@lib/provider'
import type { Network } from '@lib/provider/constants'
import { chains } from '@lib/provider/constants'
import type { Token } from '@lib/token'
import { chains as chainsTokens, getToken } from '@llamafolio/tokens'
import type { Address, PublicClient } from 'viem'
import { getAddress } from 'viem'

import { balanceOfABI } from './abi'
import type { SupportedNetwork } from './contract'
import { chainIsSupported, contractDetails } from './contract'

/**
 * if you don't provide a token list, it will use the default token list for the chain (see https://github.com/llamafolio/llamafolio-tokens)
 */
export async function getERC20BalanceOf(parameters: {
  address: Address
  chain: SupportedNetwork | Network
  client: PublicClient
  tokens?: Array<Token>
}): Promise<any[]> {
  if (!parameters.client.chain) {
    parameters.client.chain = chains.mainnet
  }
  const tokens = parameters.tokens ?? chainsTokens[parameters.chain as SupportedNetwork]
  // @ts-ignore
  let balances
  if (chainIsSupported(parameters.chain)) {
    const { address, abi } = contractDetails(parameters.chain)
    const multiBalanceCall = await parameters.client.readContract({
      address,
      abi,
      functionName: 'getBalances',
      args: [getAddress(parameters.address), tokens.map((token) => getAddress(token.address))],
      // args: [getAddress(ctx.address), tokens.map((token) => getAddress(token.address))],
    })
    balances = tokens.map((token, index) => ({ ...token, amount: Number(multiBalanceCall[index]) }))
  } else {
    const balanceOfBatch = await parameters.client.multicall({
      contracts: tokens.map((token) => ({
        abi: balanceOfABI,
        functionName: 'balanceOf',
        address: getAddress(token.address),
        args: [getAddress(token.address)],
      })),
    })
    balances =
      // tokens.map((token, index) => ({ ...token, amount: Number(balanceOfBatch[index]) }))
      balanceOfBatch.map((balance, index) => ({ amount: Number(balance.result), ...tokens[index] }))
  }

  return balances.filter((balance) => balance.amount > 0)
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
  // fs.writeFileSync('missingTokens.json', JSON.stringify(missingTokens, null, 2))

  const provider = evmClient(ctx.chain, {
    protocol: 'http',
    options: {
      batch: {
        multicall: {
          batchSize: 1_024 * 2,
          wait: 18,
        },
      },
    },
  })

  const symbols = await provider.multicall({
    contracts: missingTokens.map((address) => ({
      abi: balanceOfABI,
      address: getAddress(address),
      functionName: 'symbol',
      args: [],
    })),
  })

  const decimals = await provider.multicall({
    contracts: missingTokens.map((address) => ({
      abi: balanceOfABI,
      address: getAddress(address),
      functionName: 'decimals',
      args: [],
    })),
  })

  for (let i = 0; i < missingTokens.length; i++) {
    const address = missingTokens[i]
    if (symbols[i].status !== 'success' || decimals[i].status !== 'success') {
      console.error(`Could not get symbol or decimals for token ${ctx.chain}:${address}`)
      continue
    }

    found[address] = {
      chain: ctx.chain,
      address,
      // @ts-ignore
      symbol: symbols[i],
      // @ts-ignore
      decimals: decimals[i],
    }
  }

  return Object.values(found)
}
