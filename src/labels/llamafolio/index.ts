export interface LlamaLabel {
  labels?: string[]
  links?: { [key: string]: string }
}

export async function fetchLlamaFolioLabel(address: `0x${string}`): Promise<LlamaLabel | undefined> {
  const response = await fetch(
    `https://raw.githubusercontent.com/llamafolio/llamafolio-labels/main/labels/${address}.json`,
  )

  if (response.ok) {
    const json = await response.json()
    return json
  }
}
