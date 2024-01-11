import '../environment'

import { client } from '@db/clickhouse'
import { type ContractInfo, insertContracts } from '@db/contracts'
import { chainByChainId, getChainId } from '@lib/chains'
import { fetcher } from '@lib/fetcher'
import { parseAddresses, toDateTime } from '@lib/fmt'

import environment from '../environment'

interface ContractCreationEtherscanResponse {
  status: string
  message: string
  result: [
    {
      contractAddress: string
      contractCreator: string
      txHash: string
    },
  ]
}

interface SourceCodeEtherscanResponse {
  status: string
  message: string
  result: [
    {
      SourceCode: string
      ABI: string
      ContractName: string
      CompilerVersion: string
      OptimizationUsed: string
      Runs: string
      ConstructorArguments: string
      EVMVersion: string
      Library: string
      LicenseType: string
      Proxy: string
      Implementation: string
      SwarmSource: string
    },
  ]
}

interface ABIEtherscanResponse {
  status: string
  message: string
  result: string
}

function help() {
  console.log('pnpm run get-contract-info')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: get-contract-info.ts
  // argv[2]: chain
  // argv[3]: address (comma separated, max 5 at a time)
  // argv[4]: protocol (optional)
  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const chainInfo = chainByChainId[getChainId(process.argv[2])]
  if (!chainInfo) {
    return console.error(`Chain not found ${process.argv[2]}`)
  }

  const addresses = parseAddresses(process.argv[3] || '')
  if (!addresses) {
    return console.error('Invalid addresses')
  }

  const adapter_id = process.argv[4] || ''

  try {
    const now = new Date()

    if (chainInfo.id === 'ethereum') {
      const [contractCreationsRes, abisRes] = await Promise.all([
        fetcher<ContractCreationEtherscanResponse>(
          `https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${addresses.join(
            ',',
          )}&apikey=${environment.ETHERSCAN_API_KEY}`,
        ),
        Promise.all(
          addresses.map((address) =>
            fetcher<SourceCodeEtherscanResponse>(
              `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${environment.ETHERSCAN_API_KEY}`,
            ),
          ),
        ),
      ])

      if (contractCreationsRes.message !== 'OK') {
        console.error(`Failed to get contract creations`, contractCreationsRes.message)
        return
      }

      const contractsInfo: ContractInfo[] = []

      for (let idx = 0; idx < addresses.length; idx++) {
        const address = addresses[idx].toLowerCase()
        const abiSuccess = abisRes[idx].message === 'OK'

        if (!abiSuccess) {
          console.log(`Failed to get ABI`, abisRes[idx].message)
        }

        const abi = abiSuccess && Array.isArray(abisRes[idx].result[0].ABI) ? abisRes[idx].result[0].ABI : ''
        const name = abiSuccess ? abisRes[idx].result[0].ContractName : ''
        const data = abiSuccess ? abisRes[idx].result[0] : {}

        const contractCreation = contractCreationsRes.result.find(
          (result) => result.contractAddress.toLowerCase() === address,
        )

        contractsInfo.push({
          chain: chainInfo.chainId,
          address: addresses[idx].toLowerCase(),
          abi,
          name,
          creator: contractCreation?.contractCreator?.toLowerCase() || '',
          transaction_hash: contractCreation?.txHash?.toLowerCase() || '',
          verified: abiSuccess,
          data: JSON.stringify(data),
          adapter_id,
          timestamp: toDateTime(now),
          updated_at: toDateTime(now),
        })
      }

      await insertContracts(client, contractsInfo)

      console.log(`Successfully inserted ${contractsInfo.length} contracts`)
      return
    }
  } catch (e) {
    console.log('Failed to get contract info', e)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
