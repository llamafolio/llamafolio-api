import environment from '@environment'
import { fetcher } from '@lib/fetcher'
import { fromAddresses } from '@lib/fmt'

interface IAddressLabelsResponse {
  [key: string]: ILabelResponse[]
}

interface ILabelResponse {
  text?: string
  bg?: string
  textColor?: string
  tooltip: string
  icon?: string
}

export interface ILabel extends ILabelResponse {
  address: `0x${string}`
}

export async function fetchLabels(addresses: `0x${string}`[]) {
  const labels: ILabel[] = []

  const res = await fetcher<IAddressLabelsResponse>(
    `https://accounts.llama.fi/api/v2/address/${fromAddresses(addresses)}`,
    {
      headers: {
        cookie: `apikey=${environment.DEFILLAMA_LABELS_API_KEY}`,
      },
    },
  )

  for (const address of addresses) {
    const _address = address.toLowerCase() as `0x${string}`
    const labelsRes = res[_address] || []
    for (const labelRes of labelsRes) {
      labels.push({
        ...labelRes,
        address: _address,
      })
    }
  }

  return labels
}
