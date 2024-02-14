import { selectDistinctAdaptersIds } from '@db/adapters'
import { client } from '@db/clickhouse'
import { selectLatestTokensYields } from '@db/lendBorrowMarkets'
import { badRequest, serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { call } from '@lib/call'
import { chainByChainId, getChainId, getRPCClient } from '@lib/chains'
import { abi as erc20Abi } from '@lib/erc20'
import { parseAddress } from '@lib/fmt'
import { isNotNullish } from '@lib/type'
import type { APIGatewayProxyHandler } from 'aws-lambda'

export const handler: APIGatewayProxyHandler = async (event) => {
  const address = parseAddress(event.pathParameters?.address || '')
  if (address == null) {
    return badRequest('Missing address parameter')
  }

  const chainId = getChainId(event.pathParameters?.chain || '')
  if (!chainId) {
    return badRequest('Invalid chain parameter')
  }

  const chain = chainByChainId[chainId].id
  const ctx: BaseContext = { chain, adapterId: '', client: getRPCClient({ chain }) }

  try {
    const [adapterIdsRes, llamaDatas, defillamaDatas, { decimals, symbol }] = await Promise.all([
      selectDistinctAdaptersIds(client),
      selectLatestTokensYields(client),
      fetch('https://yields.llama.fi/lendBorrow').then((res) => res.json()),
      fetchToken(ctx, address),
    ])

    const tokens = llamaDatas
      .map((llamaData) => {
        const matchingRawData = defillamaDatas.find((rawData: any) => rawData.pool === llamaData.pool)
        if (!matchingRawData) return null

        const { chain, adapter_id, address, pool, underlyings, apy, apy_reward } = llamaData
        const { apyBaseBorrow, apyRewardBorrow, totalSupplyUsd, totalBorrowUsd, ltv, borrowable } = matchingRawData

        return {
          chain,
          adapter_id,
          address,
          pool,
          underlying: { chain, address: underlyings[0], decimals, symbol },
          apyInfos: {
            apy,
            apy_reward,
            apyBaseBorrow,
            apyRewardBorrow,
            totalSupplyUsd,
            totalBorrowUsd,
            ltv,
            borrowable,
          },
        }
      })
      .filter(isNotNullish)
      .map(mergeToken)
      .filter(
        (token) =>
          adapterIdsRes.map(({ id }) => id).includes(token.adapter_id) &&
          token.underlying.address.toLowerCase() === address &&
          token.chain == chainId,
      )

    return success(tokens, { maxAge: 3 * 60, swr: 60 })
  } catch (error) {
    console.error('Failed to find lend/borrow markets', error)
    return serverError('Failed to find lend/borrow markets', { error })
  }
}

function mergeToken(token: any) {
  return { ...token, lend: token.apyInfos.ltv !== undefined, borrow: !!token.apyInfos.borrowable }
}

async function fetchToken(ctx: BaseContext, tokenAddress: `0x${string}`) {
  const [decimals, symbol] = await Promise.all([
    call({ ctx, abi: erc20Abi.decimals, target: tokenAddress }),
    call({ ctx, abi: erc20Abi.symbol, target: tokenAddress }),
  ])

  return { decimals, symbol }
}
