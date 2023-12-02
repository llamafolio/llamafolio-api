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

const WINDOWS: Window[] = ['D', 'W', 'M', 'Y']

interface TokenBalanceChartResponse {
  data: { timestamp: number; amount: string; inflow: string }[]
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
    const data: { timestamp: number; amount: string; inflow: string }[] = [
      { timestamp: now, amount: value.toString(), inflow: '0' },
    ]
    for (let i = chartData.length - 1; i >= 0; i--) {
      value += BigInt(chartData[i][1])
      data.push({ timestamp: chartData[i][0], amount: value.toString(), inflow: chartData[i][1] })
    }

    const response: TokenBalanceChartResponse = { data: data.reverse() }

    return success(response, { maxAge: 10 * 60 })
  } catch (error) {
    console.error('Failed to get gas token balance chart', { error })
    return serverError('Failed to get token balance chart')
  }
}
