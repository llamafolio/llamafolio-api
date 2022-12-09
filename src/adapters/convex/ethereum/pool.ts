import { call } from '@defillama/sdk/build/abi'
import { Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getPoolFromLpTokenAddress, getPoolsUnderlyings } from '@lib/underlyings'

interface PoolParams extends Contract {
  poolAddress: string
  lpToken: string
  rewardAddress: string
  underlying?: Contract
}

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
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

  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'address', name: 'lptoken', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'gauge', type: 'address' },
      { internalType: 'address', name: 'crvRewards', type: 'address' },
      { internalType: 'address', name: 'stash', type: 'address' },
      { internalType: 'bool', name: 'shutdown', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  getPoolFromLPToken: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 2443,
  },

  getUnderlyings: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
  },
}

export async function getPoolsContract(chain: Chain, contract: Contract) {
  const pools: Contract[] = []

  const getPoolsCount = await call({
    chain,
    target: contract.address,
    params: [],
    abi: abi.poolLength,
  })

  const getPoolInfos = await multicall({
    chain,
    calls: range(0, getPoolsCount.output).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: abi.poolInfo,
  })

  const poolInfos = getPoolInfos
    .filter((res) => res.success)
    .map((res) => res.output)
    .filter((res) => res.lptoken !== '0xB15fFb543211b558D40160811e5DcBcd7d5aaac9') // dead address

  for (let i = 0; i < poolInfos.length; i++) {
    const poolInfo = poolInfos[i]
    console.log(poolInfo.lptoken, i)
  }

  const lptokensAddresses: string[] = poolInfos.map((token) => token.lptoken)

  const [lpTokens, poolsFromLpTokensAddresses] = await Promise.all([
    getERC20Details(chain, lptokensAddresses),
    getPoolFromLpTokenAddress(chain, lptokensAddresses),
  ])

  const underlyings = await getPoolsUnderlyings(chain, poolsFromLpTokensAddresses)

  for (let i = 0; i < underlyings.length; i++) {
    const lpToken = lpTokens[i]
    const poolInfo = poolInfos[i]
    const poolAddress = poolsFromLpTokensAddresses[i]
    const underlying = underlyings[i]

    const pool: PoolParams = {
      ...lpToken,
      address: poolInfo.crvRewards,
      poolAddress: poolAddress,
      lpToken: poolInfo.lptoken,
      underlyings: underlying,
      rewardAddress: poolInfo.crvRewards,
    }
    pools.push(pool)
  }

  return pools
}
