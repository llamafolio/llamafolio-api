import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  getPluginsInfo: {
    inputs: [],
    name: 'getPluginsInfo',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'index', type: 'uint256' },
          { internalType: 'address', name: 'plugin', type: 'address' },
          { internalType: 'address', name: 'underlying', type: 'address' },
          { internalType: 'address', name: 'gauge', type: 'address' },
          { internalType: 'address', name: 'bribe', type: 'address' },
          { internalType: 'bool', name: 'isAlive', type: 'bool' },
          { internalType: 'string', name: 'symbol', type: 'string' },
          { internalType: 'string', name: 'protocol', type: 'string' },
        ],
        internalType: 'struct Controller.Plugin[]',
        name: 'plugins',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getToupeeContracts(ctx: BaseContext, controller: Contract): Promise<Contract[]> {
  const poolInfos = await call({ ctx, target: controller.address, abi: abi.getPluginsInfo })

  const pools: Contract[] = poolInfos.map((info) => {
    const { plugin, underlying } = info
    return { chain: ctx.chain, address: plugin, token: underlying }
  })

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token! })
}
