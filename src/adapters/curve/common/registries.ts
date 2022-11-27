import { Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'

export const getRegistries = async (chain: Chain, provider: Contract): Promise<Contract> => {
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
