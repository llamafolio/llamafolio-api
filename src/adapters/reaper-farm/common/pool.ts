import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  getPoolId: {
    inputs: [],
    name: 'getPoolId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const chainId: { [key: string]: string } = {
  // chainId.string(16)
  optimism: '0xa',
  fantom: '0xfa',
  bsc: '0x38',
  arbitrum: '0xa4b1',
}

interface IParams {
  address: `0x${string}`
  tokens: any
  provider: string
}

export async function getReaperPools(ctx: BaseContext): Promise<Contract[]> {
  const chain = chainId[ctx.chain]
  const URL = `https://2ch9hbg8hh.execute-api.us-east-1.amazonaws.com/dev/api/vaults/${chain}`
  const datas = await fetch(URL).then((res) => res.json())

  console.log(URL)

  const pools: Contract[] = Object.values(datas.data).map((data) => {
    const { address, tokens, provider } = data as IParams
    const { lpToken, underlyingTokens } = tokens

    return {
      chain: ctx.chain,
      address,
      token: lpToken.address,
      underlyings: underlyingTokens.length > 0 ? underlyingTokens.map((token: Contract) => token.address) : undefined,
      provider: provider.toLowerCase(),
    }
  })

  return getPoolIds(ctx, pools)
}

async function getPoolIds(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const balancerPools = pools.filter((pool) => pool.provider === 'beethoven' || pool.provider === 'balancer')
  const nonBalancerPools = pools.filter((pool) => pool.provider !== 'beethoven' && pool.provider !== 'balancer')

  const poolIds = await multicall({
    ctx,
    calls: balancerPools.map((pool) => ({ target: pool.token! }) as const),
    abi: abi.getPoolId,
  })

  const fmtBalancerPools = mapSuccessFilter(poolIds, (res, index) => ({ ...balancerPools[index], poolId: res.output }))

  return [...nonBalancerPools, ...fmtBalancerPools]
}
