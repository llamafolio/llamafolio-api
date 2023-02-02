import { badRequest, serverError, success } from '@handlers/response'
import { isHex } from '@lib/buf'
import { getContracts, HASURA_HEADERS } from '@lib/indexer'
import { APIGatewayProxyHandler } from 'aws-lambda'

export interface IContract {
  block: number
  chain: string
  contract: string
  creator: string
  hash: string
  protocol?: string
  abi?: any
  name?: string
}

export const getContract: APIGatewayProxyHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const address = event.pathParameters?.address

  if (!address) {
    return badRequest('Missing address parameter')
  }
  if (!isHex(address)) {
    return badRequest('Invalid address parameter, expected hex')
  }

  try {
    const chain = event.queryStringParameters?.chain

    const { contracts } = await getContracts(address, chain, HASURA_HEADERS)

    const contractsData = contracts.map((contract) => {
      const contractData: IContract = {
        block: contract.block,
        chain: contract.chain,
        contract: contract.contract,
        creator: contract.creator,
        hash: contract.hash,
      }

      if (contract.contract_information?.abi) {
        contractData.abi = JSON.parse(contract?.contract_information.abi)
      }

      if (contract.contract_information?.name) {
        contractData.name = contract?.contract_information.name
      }

      if (contract.adapter) {
        contractData.protocol = contract.adapter.adapter_id
      }

      return contractData
    })

    return success(
      {
        data: contractsData,
      },
      { maxAge: 2 * 60 },
    )
  } catch (e) {
    console.error('Failed to retrieve contracts', e)
    return serverError('Failed to retrieve contracts')
  }
}
