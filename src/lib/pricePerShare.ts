import type { BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

interface OutputResponse {
  output: bigint
}

export async function getPricePerShare(
  ctx: BalancesContext,
  contract: Contract,
  params = { getAddress: (contract: Contract) => contract.token },
): Promise<number> {
  const target = params.getAddress(contract) || contract.address

  const [tokenBalance, tokenSupply] = await Promise.all([
    call({ ctx, target, params: [contract.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: contract.address, abi: erc20Abi.totalSupply }),
  ])

  return Number(tokenBalance) / Number(tokenSupply)
}

export async function getPricesPerShares(
  ctx: BalancesContext,
  contracts: Contract[],
  params = { getAddress: (contract: Contract) => contract.token },
): Promise<number[]> {
  const tokenCalls = contracts.map((contract) => {
    const target = params.getAddress(contract) || contract.address
    return { target, params: [contract.address] } as const
  })

  const suppliesCalls = contracts.map((contract) => {
    return { target: contract.address } as const
  })

  const [tokenBalances, suppliesBalances] = await Promise.all([
    multicall({ ctx, calls: tokenCalls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: suppliesCalls, abi: erc20Abi.totalSupply }),
  ])

  return mapMultiSuccessFilter(
    tokenBalances.map((_, i) => [tokenBalances[i], suppliesBalances[i]]),

    (res) => {
      const [{ output: balance }, { output: supply }] = res.inputOutputPairs as OutputResponse[]
      return Number(balance) / Number(supply)
    },
  )
}
