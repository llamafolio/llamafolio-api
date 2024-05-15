import { groupBy } from '@lib/array'

interface Bridge {
  id: number
  name: string
  displayName: string
  lastHourlyVolume: number
  lastDailyVolume: number
  currentDayVolume: number
  weeklyVolume: number
  monthlyVolume: number
  chains: string[]
  tokens: BridgeToken[]
  destinationChain: string | false
}

interface BridgeToken {
  bridgeId: number
  bridge_name: string
  chain: `0x${string}`
  token: `0x${string}`
  sourceChain: string
}

const LLAMA_BRIDGELIST_API = 'https://bridges.llama.fi/bridges?includeChains=true'
const LLAMA_BRIDGE_TSX = 'https://bridges.llama.fi/transactions'

export async function selectBridgesLists(): Promise<Bridge[] | undefined> {
  try {
    const { bridges } = await fetch(LLAMA_BRIDGELIST_API).then((res) => res.json())

    return bridges.map((bridge: Bridge) => {
      const {
        id,
        name,
        displayName,
        lastHourlyVolume,
        lastDailyVolume,
        currentDayVolume,
        weeklyVolume,
        monthlyVolume,
        chains,
        destinationChain,
      } = bridge

      return {
        id,
        name,
        displayName,
        lastHourlyVolume,
        lastDailyVolume,
        currentDayVolume,
        weeklyVolume,
        monthlyVolume,
        chains,
        destinationChain,
      }
    })
  } catch (error) {
    console.log(error)
    return undefined
  }
}

export async function selectBridgeWithTokens() {
  try {
    const bridgeLists = await selectBridgesLists()
    if (!bridgeLists) return

    const tokensBybridges = await processBridges(bridgeLists)

    return bridgeLists.map((bridge) => {
      const tokensForBridge = tokensBybridges.filter((token) => token.bridgeId === bridge.id)
      const uniqueTokens = processUniqueTokens(tokensForBridge)
      const sortedTokens = groupBy(uniqueTokens, 'sourceChain')

      return { ...bridge, tokens: sortedTokens }
    })
  } catch (error) {
    console.log(error)
  }
}

async function fetchBridgeTransactions(id: number, chain: string) {
  const startTimestamp = Math.floor(Date.now() / 1000 - 86400)
  const endTimestamp = Math.floor(Date.now() / 1000)
  const url = `${LLAMA_BRIDGE_TSX}/${id}?sourcechain=${chain}&limit=200&starttimestamp=${startTimestamp}&endtimestamp=${endTimestamp}`
  try {
    const response = await fetch(url)
    if (!response.ok) console.error(`Request to ${url} failed with status ${response.status}`)

    const data = await response.json()
    return data.map(({ bridge_name, chain, token, sourceChain }: BridgeToken) => ({
      bridgeId: id,
      bridge_name,
      chain,
      token,
      sourceChain,
    }))
  } catch (error) {
    console.error(`Failed to fetch or parse JSON from ${url}`, error)
    throw error
  }
}

async function processChainsForBridge(bridge: Bridge) {
  const transactions: BridgeToken[] = []
  const { id, chains, lastDailyVolume } = bridge

  for (const chain of chains) {
    if (lastDailyVolume == 0) continue

    const chainTransactions = await fetchBridgeTransactions(id, chain)
    transactions.push(...chainTransactions)
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  return transactions.flat()
}

async function processBridges(bridges: Bridge[]) {
  const tsxs = await Promise.all(bridges.map(processChainsForBridge))
  return tsxs.flat()
}

function processUniqueTokens(tsx: BridgeToken[]) {
  return tsx.filter(
    (tsx, index, self) =>
      index ===
      self.findIndex(
        (t) =>
          t.bridge_name === tsx.bridge_name &&
          t.chain === tsx.chain &&
          t.token === tsx.token &&
          t.sourceChain === tsx.sourceChain,
      ),
  )
}

selectBridgeWithTokens().then((res) => console.log(res))
