const GOVERNANCE_SNAPSHOT_API = 'https://defillama-datasets.llama.fi/governance-cache/overview/snapshot.json'
const PROTOCOL_GOVERNANCE_SNAPSHOT_API = 'https://defillama-datasets.llama.fi/governance-cache/snapshot'

export interface GovernanceSnapshotResponse {
  [key: string]: GovernanceSnapshot
}

export interface GovernanceSnapshot {
  proposalsCount: number
  successfulProposals: number
  followersCount: number
  name: string
  chainName: string
  id: string
  strategyCount: number
  highestTotalScore: number
  propsalsInLast30Days: number
  successfulPropsalsInLast30Days: number
  states: MonthStates
  months: { [key: string]: Month }
}

export interface Month {
  proposals: string[]
  total: number
  successful: number
  states: MonthStates
}

export interface MonthStates {
  closed: number
}

export async function fetchGovernanceSnapshot() {
  try {
    const res = await fetch(GOVERNANCE_SNAPSHOT_API)
    const json: GovernanceSnapshotResponse = await res.json()
    return json
  } catch (error) {
    console.error('Failed to fetch governance snapshot', error)
    return {}
  }
}

export interface ProtocolGovernanceResponse {
  metadata: Metadata
  id: string
  proposals: { [key: string]: GovernanceProposal }
  stats: Stats
}

export interface Metadata {
  id: string
  name: string
  about: string
  network: string
  symbol: string
  strategies: any[]
  admins: string[]
  moderators: any[]
  members: string[]
  filters: any
  private: boolean
  location: null
  avatar: string
  terms: null
  twitter: string
  github: string
  coingecko: string
  email: null
  domain: string
  validation: any
  voteValidation: any
  followersCount: number
  proposalsCount: number
  parent: null
  children: any[]
  treasuries: any[]
  chainName: string
}

export interface GovernanceProposal {
  id: string
  title: string
  choices: string[]
  start: number
  end: number
  snapshot: string
  state: State
  author: string
  network: string
  space: any
  quorum: number
  privacy: any
  link: string
  app: any
  scores: number[]
  scores_total: number
  scores_updated: number
  discussion: string
  votes: number
  month: string
  score_skew?: number
  score_curve?: number
  score_curve2?: number
}

export enum State {
  Active = 'active',
  Closed = 'closed',
  Pending = 'pending',
}

export interface Stats {
  proposalsCount: number
  successfulProposals: number
  followersCount: number
  name: string
  chainName: string
  id: string
  strategyCount: number
  highestTotalScore: number
  proposalsByDate: string[]
  proposalsBySkew: string[]
  proposalsByScore: string[]
  propsalsInLast30Days: number
  successfulPropsalsInLast30Days: number
  states: StatsStates
}

export interface StatsStates {
  closed: number
  pending: number
  active: number
}

export async function fetchProtocolGovernanceSnapshot(id: string) {
  try {
    const res = await fetch(PROTOCOL_GOVERNANCE_SNAPSHOT_API + '/' + id.replace(/(:|’|')/g, '/') + '.json')
    const json: ProtocolGovernanceResponse = await res.json()
    return json
  } catch (error) {
    console.error('Failed to fetch protocol governance snapshot', error)
    return null
  }
}
