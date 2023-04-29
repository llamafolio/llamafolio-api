export interface LlamaLabel {
  labels?: string[]
  links?: { [key: string]: string }
}

export async function fetchLlamaFolioLabel(address: string): Promise<LlamaLabel> {
  const llamaLabels = await fetch(
    `https://raw.githubusercontent.com/llamafolio/llamafolio-labels/main/labels/${address}.json`,
  )
  const json = await llamaLabels.json()
  return json
}
