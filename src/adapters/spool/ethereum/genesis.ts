import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const Spool: Token = {
  chain: 'ethereum',
  address: '0x40803cEA2b2A32BdA1bE61d3604af6a814E70976',
  decimals: 18,
  symbol: 'SPOOL',
}

const DAI: Token = {
  chain: 'ethereum',
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  decimals: 18,
  symbol: 'DAI',
}

const USDC: Token = {
  chain: 'ethereum',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  symbol: 'USDC',
}

const USDT: Token = {
  chain: 'ethereum',
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  decimals: 6,
  symbol: 'USDT',
}

export async function getGenesisContracts(chain: Chain, pools: string[]) {
  const contracts: Contract[] = []

  const getName = await multicall({
    chain,
    calls: pools.map((pool) => ({
      target: pool,
      params: [],
    })),
    abi: {
      inputs: [],
      name: 'name',
      outputs: [{ internalType: 'string', name: '', type: 'string' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  for (let i = 0; i < getName.length; i++) {
    if (!isSuccess(getName[i])) {
      continue
    }

    const pool = pools[i]
    const name = getName[i].output

    contracts.push({
      chain: 'ethereum',
      name,
      address: pool,
    })
  }

  return contracts
}

export async function getYieldBalances(ctx: BaseContext, chain: Chain, pools: Contract[]) {
  const balances: Balance[] = []

  const [getDeposit, getEarned] = await Promise.all([
    multicall({
      chain,
      calls: pools.map((pool) => ({
        target: pool.address,
        params: [ctx.address],
      })),
      abi: {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'users',
        outputs: [
          { internalType: 'uint128', name: 'instantDeposit', type: 'uint128' },
          { internalType: 'uint128', name: 'activeDeposit', type: 'uint128' },
          { internalType: 'uint128', name: 'owed', type: 'uint128' },
          { internalType: 'uint128', name: 'withdrawnDeposits', type: 'uint128' },
          { internalType: 'uint128', name: 'shares', type: 'uint128' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    multicall({
      chain,
      calls: pools.map((pool) => ({
        target: pool.address,
        params: [Spool.address, ctx.address],
      })),
      abi: {
        inputs: [
          { internalType: 'contract IERC20', name: 'token', type: 'address' },
          { internalType: 'address', name: 'account', type: 'address' },
        ],
        name: 'earned',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const deposits = getDeposit.filter((res) => res.success).map((res) => BigNumber.from(res.output.instantDeposit))
  const earneds = getEarned.filter((res) => res.success).map((res) => BigNumber.from(res.output))

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const deposit = deposits[i]
    const earned = earneds[i]

    let underlyings: Contract[] = []

    switch (true) {
      case pool.name?.includes('DAI'):
        underlyings = [DAI]
        break

      case pool.name?.includes('USDC'):
        underlyings = [USDC]
        break

      case pool.name?.includes('USDT'):
        underlyings = [USDT]
        break

      default:
        null
        break
    }

    balances.push({
      chain,
      name: pool.name,
      address: pool.address,
      symbol: ` genesis-${underlyings[0].symbol}`,
      decimals: underlyings[0].decimals,
      amount: deposit,
      underlyings,
      rewards: [{ ...Spool, amount: earned }],
      category: 'farm',
    })
  }

  return balances
}
