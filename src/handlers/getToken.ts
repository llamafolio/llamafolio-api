import { selectAdaptersContractsByAddress } from '@db/contracts'
import pool from '@db/pool'
import { badRequest, notFound, serverError, success } from '@handlers/response'
import type { Balance, BaseContext, BaseContract, PricedBalance } from '@lib/adapter'
import { isHex } from '@lib/buf'
import { call } from '@lib/call'
import type { Chain } from '@lib/chains'
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

/**
 * Underlyings match if they have the same addresses (order can vary)
 * @param underlyingsList
 */
function getIsMatchUnderlyings(underlyingsList: (BaseContract[] | undefined)[]) {
  if (underlyingsList.length === 0) {
    return false
  }

  const keys = new Set<string>()
  for (const underlyings of underlyingsList) {
    if (!underlyings) {
      return false
    }

    const key = underlyings
      .map((contract) => contract.address)
      .sort()
      .join('_')

    keys.add(key)
  }

  return keys.size === underlyingsList.length
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const chain = event.pathParameters?.chain as Chain
  const address = event.pathParameters?.address?.toLowerCase() as `0x${string}`

  if (!chain) {
    return badRequest('Missing chain parameter')
  }

  if (!address) {
    return badRequest('Missing address parameter')
  }

  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  const client = await pool.connect()

  const ctx: BaseContext = { chain, adapterId: '' }

  try {
    // - the same token may be used in multiple protocols.
    // - token key can also be used to retrieve token details, ignore it
    const adaptersContracts = (await selectAdaptersContractsByAddress(client, address, chain)).filter(
      (contract) => !contract.token || contract.token?.toLowerCase() === address,
    )

    const symbol = adaptersContracts.find((contract) => contract.symbol != null)?.symbol
    let decimals = adaptersContracts.find((contract) => contract.decimals != null)?.decimals

    const contractsUnderlyings = adaptersContracts.map((contract) => contract.underlyings)

    // @ts-expect-error
    const isMatchUnderlyings = getIsMatchUnderlyings(contractsUnderlyings)

    const [_symbol, _decimals, totalSupply, underlyingsBalances] = await Promise.all([
      !symbol ? call({ ctx, target: address, abi: erc20Abi.symbol }).catch(() => undefined) : undefined,
      !decimals ? call({ ctx, target: address, abi: erc20Abi.decimals }).catch(() => undefined) : undefined,
      call({ ctx, target: address, abi: erc20Abi.totalSupply }).catch(() => undefined),
      isMatchUnderlyings
        ? multicall({
            ctx,
            calls: contractsUnderlyings[0]!.map(
              (underlying) =>
                ({
                  target: (underlying as unknown as BaseContract).address,
                  params: [address],
                } as const),
            ),
            abi: erc20Abi.balanceOf,
          })
        : undefined,
    ])

    decimals = decimals || _decimals

    const underlyings = underlyingsBalances?.map((balanceOfRes, idx) => ({
      ...formatBaseContract(contractsUnderlyings[0]![idx]),
      amount: balanceOfRes.output,
    }))
    const pricedUnderlyings = await getPricedBalances(underlyings as Balance[])
    const pricedUnderlyingByAddress = keyBy(pricedUnderlyings, 'address')

    // return underlyings even if we fail to find their price (more info to display)
    const maybePricedUnderlyings = underlyings?.map(
      (underlying) => pricedUnderlyingByAddress[underlying.address] || underlying,
    )

    const totalPoolValue =
      pricedUnderlyings &&
      pricedUnderlyings.length > 1 &&
      underlyings?.every((pricedUnderlying) => (pricedUnderlying as PricedBalance).balanceUSD)
        ? sum(underlyings.map((pricedUnderlying) => (pricedUnderlying as PricedBalance).balanceUSD || 0))
        : undefined

    const token = {
      chain,
      address,
      symbol: symbol || _symbol,
      decimals,
      totalSupply,
      // value of LP token = total pool value / LP token total supply
      price:
        totalSupply != null && totalSupply > 0n && totalPoolValue && decimals
          ? totalPoolValue / Number(totalSupply / 10n ** BigInt(decimals))
          : undefined,
      underlyings: maybePricedUnderlyings,
    }

    if (!token.symbol && !token.decimals) {
      return notFound('Token not found', { maxAge: 60 * 60 })
    }

    return success(token, { maxAge: 60 * 60 })
  } catch (e) {
    console.error('Failed to retrieve token', e)
    return serverError('Failed to retrieve token')
  } finally {
    client.release(true)
  }
}
