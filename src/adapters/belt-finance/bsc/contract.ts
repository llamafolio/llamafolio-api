import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

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
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'poolInfo',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: 'want',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'allocPoint',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'lastRewardBlock',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'accBELTPerShare',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'strat',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    inputs: [],
    name: 'token',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const BELT: Token = {
  chain: 'bsc',
  address: '0xe0e514c71282b6f4e823703a39374cf58dc3ea4f',
  decimals: 18,
  symbol: 'BELT',
}

export async function getBeltContracts(ctx: BaseContext, masterchef: Contract, lps: Contract[]): Promise<Contract[]> {
  const poolLength = await call({ ctx, target: masterchef.address, abi: abi.poolLength })

  const poolInfosRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((index) => ({ target: masterchef.address, params: [index] }) as const),
    abi: abi.poolInfo,
  })

  const contracts: Contract[] = mapSuccessFilter(poolInfosRes, (res, idx) => {
    const [want, _allocPoint, _lastRewardBlock, _accBELTPerShare, _strat] = res.output
    return {
      chain: 'bsc',
      address: want,
      token: want,
      pid: idx,
      rewards: [BELT],
    }
  })

  // Merge with 4belt Lp tokens to get the underlyings
  const mergedContracts = mergeContractsAndLps(contracts, lps)

  // Research the underlyings associated with farming pools'addresses
  const underlyingsRes = await multicall({
    ctx,
    calls: contracts.map((contract) => ({ target: contract.address })),
    abi: abi.token,
  })

  for (const [idx, contract] of contracts.entries()) {
    const underlying: any = underlyingsRes[idx].success ? [underlyingsRes[idx].output] : undefined
    contract.underlyings = underlying
  }

  // Research the underlyings from PancakeSwap LPs
  const mergedContractsDetails = await getPairsDetails(ctx, mergedContracts)

  for (let i = 0; i < mergedContractsDetails.length; i++) {
    const contractIndex = mergedContracts.findIndex((c) => c.address === mergedContractsDetails[i].address)
    if (contractIndex !== -1) {
      mergedContracts[contractIndex] = Object.assign({}, mergedContracts[contractIndex], mergedContractsDetails[i])
    }
  }

  // Format contracts as some pools are using same lpTokens
  const fmtmergedContracts: Contract[] = mergedContracts.reduce((acc: any, pool) => {
    const { address, pid, ...rest } = pool
    if (address in acc) {
      acc[address].pid.push(pid)
    } else {
      acc[address] = { ...rest, pid: [pid] }
    }
    return acc
  }, {})

  return Object.values(fmtmergedContracts).filter((contract) => contract.underlyings && contract.underlyings.length > 0)
}

function mergeContractsAndLps(contracts: Contract[], lps: Contract[]): Contract[] {
  return contracts.map((contract) => {
    const existingLp = lps.find((lp) => lp.address.toLowerCase() === contract.address.toLowerCase())

    if (existingLp) {
      return {
        ...existingLp,
        ...contract,
      }
    } else {
      return contract
    }
  })
}
