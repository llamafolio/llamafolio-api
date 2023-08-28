import { connect } from '@db/clickhouse'
import { selectAdaptersContractsByAddress } from '@db/contracts'
import { badRequest, notFound, serverError, success } from '@handlers/response'
import type { Balance, BaseContext, BaseContract, Contract, PricedBalance } from '@lib/adapter'
import { isHex } from '@lib/buf'
import { call } from '@lib/call'
import { type Chain, chainById } from '@lib/chains'
import { abi as erc20Abi } from '@lib/erc20'
import { sum } from '@lib/math'
import { multicall } from '@lib/multicall'
import { getPricedBalances } from '@lib/price'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import { keyBy } from 'lodash'

function formatBaseContract(contract: any) {
  return {
    chain: contract.chain,
    address: contract.address,
    name: contract.name,
    decimals: contract.decimals,
    symbol: contract.symbol,
  }
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const chain = event.pathParameters?.chain as Chain
  const address = event.pathParameters?.address?.toLowerCase() as `0x${string}`

  if (!chain) {
    return badRequest('Missing chain parameter')
  }

  const chainId = chainById[chain]?.chainId
  if (chainId == null) {
    return badRequest(`Unsupported chain ${chain}`)
  }

  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  const ctx: BaseContext = { chain, adapterId: '' }

  try {
    const client = connect()

    // `token` key can also be used to retrieve token details, ignore it
    const adaptersContracts = (await selectAdaptersContractsByAddress(client, address, chainId)).filter(
      (contract) => !contract.token || contract.token?.toLowerCase() === address,
    )

    const symbol = adaptersContracts[0]?.symbol
    const decimals = adaptersContracts[0]?.decimals
    const category = adaptersContracts[0]?.category
    const adapterId = adaptersContracts[0]?.adapterId

    const contractsUnderlyings = adaptersContracts[0]?.underlyings

    const [_symbol, _decimals, totalSupply, underlyingsBalances] = await Promise.all([
      !symbol ? call({ ctx, target: address, abi: erc20Abi.symbol }).catch(() => undefined) : undefined,
      !decimals ? call({ ctx, target: address, abi: erc20Abi.decimals }).catch(() => undefined) : undefined,
      call({ ctx, target: address, abi: erc20Abi.totalSupply }).catch(() => undefined),
      contractsUnderlyings
        ? multicall({
            ctx,
            calls: contractsUnderlyings.map(
              (underlying) => ({ target: (underlying as BaseContract).address, params: [address] }) as const,
            ),
            abi: erc20Abi.balanceOf,
          })
        : undefined,
    ])

    const contract: Contract = {
      chain,
      address,
      category: category || 'wallet',
      symbol: symbol || _symbol,
      decimals: decimals || _decimals,
      adapterId,
    }

    const underlyings = contractsUnderlyings?.map((underlying, idx) => ({
      ...formatBaseContract(underlying),
      amount: underlyingsBalances?.[idx].output || undefined,
    }))
    const pricedUnderlyings = await getPricedBalances([contract, ...(underlyings || [])] as Balance[])
    const pricedUnderlyingByAddress = keyBy(pricedUnderlyings, 'address')
    // return underlyings even if we fail to find their price (more info to display)
    const maybePricedUnderlyings = underlyings?.map(
      (underlying) => pricedUnderlyingByAddress[underlying.address] || underlying,
    )

    const contractPrice = (pricedUnderlyingByAddress[contract.address] as PricedBalance)?.price

    // value of LP token = total pool value / LP token total supply
    const totalPoolValue =
      pricedUnderlyings &&
      pricedUnderlyings.length > 1 &&
      pricedUnderlyings?.every((pricedUnderlying) => (pricedUnderlying as PricedBalance).balanceUSD)
        ? sum(pricedUnderlyings.map((pricedUnderlying) => (pricedUnderlying as PricedBalance).balanceUSD || 0))
        : undefined

    const lpTokenPrice =
      totalSupply != null && totalSupply > 0n && totalPoolValue && decimals
        ? totalPoolValue / Number(totalSupply / 10n ** BigInt(decimals))
        : undefined

    const token = {
      ...contract,
      totalSupply,
      price: contractPrice || lpTokenPrice,
      underlyings: maybePricedUnderlyings,
    }

    if (!token.symbol && !token.decimals) {
      return notFound('Token not found', { maxAge: 60 * 60 })
    }

    return success(token, { maxAge: 60 * 60 })
  } catch (e) {
    console.error('Failed to retrieve token', e)
    return serverError('Failed to retrieve token')
  }
}
