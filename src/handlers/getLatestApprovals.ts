import { selectLatestApprovals } from '@db/approvals'
import { client } from '@db/clickhouse'
import { badRequest, serverError, success } from '@handlers/response'
import { getChainId } from '@lib/chains'
import { parseAddress, parseSignatureAddress, unixFromDate } from '@lib/fmt'
import type { APIGatewayProxyHandler } from 'aws-lambda'

interface Approval {
  transactionHash: string
  logIndex: number
  timestamp: number
  data: { owner: `0x${string}`; spender: `0x${string}`; value: bigint }
}

type Window = 'd' | 'w' | 'm'
const WINDOWS: Window[] = ['d', 'w', 'm']

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const chainId = getChainId(event.pathParameters?.chain || '')
  if (!chainId) {
    return badRequest('Invalid chain parameter')
  }

  const address = parseAddress(event.pathParameters?.address || '')
  if (address == null) {
    return badRequest('Missing address parameter')
  }

  const signature = parseSignatureAddress(event.pathParameters?.signature || '')
  if (signature == null) {
    return badRequest('Missing signature parameter')
  }

  const window = (event.queryStringParameters?.w?.toLowerCase() as Window) || 'd'
  if (!WINDOWS.includes(window)) {
    return badRequest('Unsupported window')
  }

  const offset = parseInt(event.queryStringParameters?.offset || '') || 0
  const limit = parseInt(event.queryStringParameters?.limit || '') || 25

  try {
    const latestApprovals = await selectLatestApprovals(client, chainId, address, signature, limit, offset, window)

    const approvals: Approval[] = latestApprovals.map((latestApproval) => {
      const {
        transactionHash,
        logIndex,
        timestamp,
        data: {
          args: [owner, spender, value],
        },
      } = latestApproval
      return { transactionHash, logIndex, timestamp, data: { owner, spender, value } }
    })

    const lastApproval = latestApprovals[latestApprovals.length - 1]
    const response = {
      updatedAt: lastApproval ? lastApproval.updatedAt : unixFromDate(new Date()),
      count: lastApproval ? lastApproval.count : 0,
      data: approvals,
    }

    return success(response, { maxAge: 3 * 60, swr: 60 })
  } catch (error) {
    console.error('Failed to retrieve latest approvals', error)
    return serverError('Failed to retrieve latest approvals', { error })
  }
}
