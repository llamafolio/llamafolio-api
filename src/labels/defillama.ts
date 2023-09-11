import environment from '@environment'
import { fetcher } from '@lib/fetcher'

interface IAddressLabelsResponse {
  [key: string]: ILabel[]
}

export interface ILabel {
  text?: string
  bg?: string
  textColor?: string
  tooltip: string
  icon?: string
}

export async function fetchLabels(address: `0x${string}`) {
  const res = await fetcher<IAddressLabelsResponse>(
    `https://accounts.llama.fi/api/v2/address/${address.toLowerCase()}`,
    {
      headers: {
        cookie: `apikey=${environment.DEFILLAMA_LABELS_API_KEY}`,
      },
    },
  )

  return res[address] || []
}
