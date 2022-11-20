import { Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'

export async function getFarmContracts(chain: Chain, contract: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const poolsLength = await call({
    chain,
    target: contract.address,
    params: [],
    abi: {
      inputs: [],
      name: 'poolLength',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const poolsAddressesRes = await multicall({
    chain,
    calls: range(0, poolsLength.output).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: {
      inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      name: 'registeredToken',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const poolsAddresses = poolsAddressesRes.filter((res) => res.success).map((res) => res.output)

  const poolInfosRes = await multicall({
    chain,
    calls: poolsAddresses.map((pool) => ({
      target: contract.address,
      params: [pool],
    })),
    abi: {
      inputs: [{ internalType: 'address', name: '', type: 'address' }],
      name: 'addressToPoolInfo',
      outputs: [
        { internalType: 'address', name: 'lpToken', type: 'address' },
        { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
        { internalType: 'uint256', name: 'lastRewardTimestamp', type: 'uint256' },
        { internalType: 'uint256', name: 'accVTXPerShare', type: 'uint256' },
        { internalType: 'address', name: 'rewarder', type: 'address' },
        { internalType: 'address', name: 'helper', type: 'address' },
        { internalType: 'address', name: 'locker', type: 'address' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const poolInfos = poolInfosRes.filter((res) => res.success).map((res) => res.output)
  const lpTokensAddresses = poolInfos.map((token) => token.lpToken)

  const [pools, lpTokens] = await Promise.all([
    getERC20Details(chain, poolsAddresses),
    getERC20Details(chain, lpTokensAddresses),
  ])

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const poolInfo = poolInfos[i]
    const lpToken = lpTokens[i]

    contracts.push({
      chain,
      address: pool.address,
      poolAddress: pool.address,
      lpToken: lpToken.address,
      rewarder: poolInfo.rewarder,
      helper: poolInfo.helper,
      decimals: lpToken.decimals,
      symbol: lpToken.symbol,
    })
  }
  return contracts
}
