import { selectTokenBalanceChart } from '@db/balances'
import { client } from '@db/clickhouse'
import type { Window } from '@db/gasUsed'
import { badRequest, serverError, success } from '@handlers/response'
import type { BaseContext } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { chainByChainId, getChainId } from '@lib/chains'
import { abi as erc20Abi } from '@lib/erc20'
import { parseAddress, parseAddresses, unixFromDate } from '@lib/fmt'
import { sumBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const WINDOWS: Window[] = ['D', 'W', 'M']

interface TokenBalanceChartResponse {
  /**
   * [timestamp, amount]
   */
  data: [number, string][]
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const addresses = parseAddresses(event.pathParameters?.address || '')
  if (addresses.length === 0) {
    return badRequest('Invalid address parameter')
  }

  const token = parseAddress(event.pathParameters?.token || '')
  if (!token) {
    return badRequest('Invalid token parameter')
  }

  const chainId = getChainId(event.queryStringParameters?.chain || 'ethereum')
  if (chainId == null) {
    return badRequest(`Unknown chain ${event.queryStringParameters?.chain}`)
  }
  const chain = chainByChainId[chainId].id

  const window = (event.queryStringParameters?.w || 'M') as Window
  if (!WINDOWS.includes(window)) {
    return badRequest(`Unsupported window ${event.queryStringParameters?.w}`)
  }

  const ctx: BaseContext = { chain, adapterId: '' }

  try {
    const [chartData, balancesRes] = await Promise.all([
      selectTokenBalanceChart(client, addresses, token, chainId, window),
      multicall({
        ctx,
        abi: erc20Abi.balanceOf,
        calls: addresses.map((address) => ({ target: token, params: [address] }) as const),
      }),
    ])

    const now = unixFromDate(new Date())
    // current balance
    let value = sumBI(mapSuccessFilter(balancesRes, (res) => res.output))

    // running sum
    const data: [number, string][] = [[now, value.toString()]]
    for (let i = chartData.length - 1; i >= 0; i--) {
      value += BigInt(chartData[i][1])
      data.push([chartData[i][0], value.toString()])
    }

    const response: TokenBalanceChartResponse = { data: data.reverse() }

    return success(response, { maxAge: 10 * 60 })
  } catch (error) {
    console.error('Failed to get gas token balance chart', { error })
    return serverError('Failed to get token balance chart')
  }
}
