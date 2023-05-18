import fs from 'node:fs'

import type { Balance, BalancesContext, BaseContext } from '@lib/adapter'
import { balanceABI } from '@lib/balance/abi'
import { evmClient } from '@lib/provider'
import type { Token } from '@lib/token'
import { getToken } from '@llamafolio/tokens'
import { getAddress } from 'viem'

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
  gnosis: '0xc9bA77C9b27481B6789840A7C3128D4f691f8296',
  celo: '0xc9ba77c9b27481b6789840a7c3128d4f691f8296',
  moonbeam: '0xc9bA77C9b27481B6789840A7C3128D4f691f8296',
  // 'harmony':'',
}

export interface GetERC20BalanceOfParams {
  getContractAddress: (contract: any) => string
}

export async function getERC20BalanceOf(ctx: BalancesContext, tokens: Token[]): Promise<Balance[]> {
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
  // @ts-ignore
  let balances
  if (ctx.chain in multiCoinContracts) {
    const multiBalanceCall = await provider.readContract({
      address: getAddress(multiCoinContracts[ctx.chain as keyof typeof multiCoinContracts]),
      abi: balanceABI,
      functionName: 'getBalances',
      args: [getAddress(ctx.address), tokens.map((token) => getAddress(token.address))],
    })
    balances = tokens.map((token, index) => ({ ...token, amount: multiBalanceCall[index] }))
  } else {
    const _balances = await provider.multicall({
      contracts: tokens.map((token) => ({
        abi: balanceABI,
        functionName: 'balanceOf',
        address: getAddress(token.address),
        args: [getAddress(token.address)],
      })),
    })
    balances = _balances
      .filter(
        (balance) => balance.status === 'success' && balance.result != null && balance.result !== 0n,
        // && Number(balance.result) > 0.00001,
      )
      .map((balance, index) => ({ amount: balance.result, ...tokens[index] }))
  }

  return balances as Balance[]
}

export async function getERC20Details(ctx: BaseContext, tokens: string[]): Promise<Token[]> {
  fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2))
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
      abi: balanceABI,
      address: getAddress(address),
      functionName: 'symbol',
      args: [],
    })),
  })

  const decimals = await provider.multicall({
    contracts: missingTokens.map((address) => ({
      abi: balanceABI,
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
