import { Balance, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { BigNumber, ethers } from 'ethers'

import { getPoolsContracts } from '../ethereum/pools'

interface PoolsContracts extends Contract {
  lpToken: string
  poolAddress: string
  tokens: string[]
  gaugeAddress: string
}

interface PoolBalances extends Balance {
  tokens: Token[]
}

const getMainAddresses = async (chain: Chain, provider: Contract): Promise<Contract> => {
  const [getRegistriesAddresses, getPoolsInfosAddresses, getFactoriesAddresses] = await Promise.all([
    call({
      chain,
      target: provider.address,
      params: [0],
      abi: {
        name: 'get_id_info',
        outputs: [
          { type: 'address', name: 'addr' },
          { type: 'bool', name: 'is_active' },
          { type: 'uint256', name: 'version' },
          { type: 'uint256', name: 'last_modified' },
          { type: 'string', name: 'description' },
        ],
        inputs: [{ type: 'uint256', name: 'arg0' }],
        stateMutability: 'view',
        type: 'function',
        gas: 12168,
      },
    }),

    call({
      chain,
      target: provider.address,
      params: [1],
      abi: {
        name: 'get_id_info',
        outputs: [
          { type: 'address', name: 'addr' },
          { type: 'bool', name: 'is_active' },
          { type: 'uint256', name: 'version' },
          { type: 'uint256', name: 'last_modified' },
          { type: 'string', name: 'description' },
        ],
        inputs: [{ type: 'uint256', name: 'arg0' }],
        stateMutability: 'view',
        type: 'function',
        gas: 12168,
      },
    }),

    call({
      chain,
      target: provider.address,
      params: [3],
      abi: {
        name: 'get_id_info',
        outputs: [
          { type: 'address', name: 'addr' },
          { type: 'bool', name: 'is_active' },
          { type: 'uint256', name: 'version' },
          { type: 'uint256', name: 'last_modified' },
          { type: 'string', name: 'description' },
        ],
        inputs: [{ type: 'uint256', name: 'arg0' }],
        stateMutability: 'view',
        type: 'function',
        gas: 12168,
      },
    }),
  ])

  const registriesAddresses = getRegistriesAddresses.output
  const poolsInfosAddresses = getPoolsInfosAddresses.output
  const factoriesAddresses = getFactoriesAddresses.output

  return {
    chain,
    name: registriesAddresses.description,
    address: registriesAddresses.addr,
    factory: factoriesAddresses.addr,
    infosGetter: poolsInfosAddresses.addr,
  }
}

export async function getPools(chain: Chain, provider: Contract, gaugeController: Contract): Promise<PoolsContracts[]> {
  const registry = await getMainAddresses(chain, provider)
  const pools = await getPoolsContracts(chain, registry)

  const contracts: PoolsContracts[] = []

  const getGaugesAddresses = await multicall({
    chain,
    calls: pools.map((pool) => ({
      target: gaugeController.address,
      params: [pool.lpToken],
    })),
    abi: {
      stateMutability: 'view',
      type: 'function',
      name: 'get_gauge_from_lp_token',
      inputs: [{ name: 'arg0', type: 'address' }],
      outputs: [{ name: '', type: 'address' }],
    },
  })

  const gaugesAddresses = getGaugesAddresses.filter((res) => res.success).map((res) => res.output)

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const gaugeAddress = gaugesAddresses[i]

    if (gaugeAddress !== ethers.constants.AddressZero)
      contracts.push({
        chain,
        address: gaugeAddress,
        lpToken: pool.lpToken,
        poolAddress: pool.poolAddress,
        tokens: pool.tokens,
        underlyings: pool.underlyings,
        gaugeAddress,
      })
  }

  return contracts
}

export async function getPoolsBalancesFromGauges(ctx: BaseContext, chain: Chain, pools: PoolsContracts[]) {
  const nonZeroPools = (await getERC20BalanceOf(ctx, chain, pools as Token[])).filter((res) => res.amount.gt(0))

  return await getUnderlyingsBalances(chain, nonZeroPools)
}

const getUnderlyingsBalances = async (chain: Chain, pools: any[]): Promise<PoolBalances[]> => {
  const balances: PoolBalances[] = []

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]

    const [getTotalSupply, getUnderlyingsBalances] = await Promise.all([
      call({
        chain,
        target: pool.lpToken,
        params: [],
        abi: {
          stateMutability: 'view',
          type: 'function',
          name: 'totalSupply',
          inputs: [],
          outputs: [
            {
              name: '',
              type: 'uint256',
            },
          ],
          gas: 3240,
        },
      }),

      multicall({
        chain,
        calls: range(0, pool.underlyings.length).map((i) => ({
          target: pool.poolAddress,
          params: [i],
        })),
        abi: {
          stateMutability: 'view',
          type: 'function',
          name: 'balances',
          inputs: [{ name: 'arg0', type: 'uint256' }],
          outputs: [{ name: '', type: 'uint256' }],
          gas: 3993,
        },
      }),
    ])

    const underlyings = await getERC20Details(chain, pool.underlyings)
    const totalSupply = BigNumber.from(getTotalSupply.output)
    const underlyingsBalances = getUnderlyingsBalances.filter((res) => res.success).map((res) => res.output)

    const formattedUnderlyings = underlyings.map((underlying, x) => ({
      ...underlying,
      amount: underlying.decimals && pool.amount.mul(underlyingsBalances[x]).div(totalSupply),
      decimals: underlying.decimals,
    }))

    balances.push({
      chain,
      address: pool.address,
      amount: pool.amount,
      decimals: 18,
      symbol: underlyings.map((underlying) => underlying.symbol).join('-'),
      tokens: underlyings.map((underlying) => underlying),
      underlyings: formattedUnderlyings,
      category: 'farm',
    })
  }

  return balances
}
