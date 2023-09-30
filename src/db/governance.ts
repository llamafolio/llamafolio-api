import type { ClickHouseClient } from '@clickhouse/client'
import environment from '@environment'
import { chainById } from '@lib/chains'
import { unixToDateTime } from '@lib/fmt'
import type { GovernanceProposal } from '@lib/governance'

export interface GovernanceProposalStorage {
  chain: string
  protocol_id: string
  id: string
  app: string
  status: string
  start_time: string
  end_time: string
  data: string
}

export interface GovernanceProposalStorable extends GovernanceProposal {
  chain: string
  protocol: string
}

function toStorage(proposals: GovernanceProposalStorable[]) {
  const proposalsStorage: GovernanceProposalStorage[] = []

  for (const proposal of proposals) {
    const { chain, protocol, ...data } = proposal

    const chainId = chainById[chain]?.chainId
    if (chainId == null) {
      console.error(`Missing chain ${chain}`)
      continue
    }

    const proposalStorage = {
      chain: chainId,
      protocol_id: protocol,
      id: proposal.id,
      app: proposal.app,
      status: proposal.state,
      start_time: unixToDateTime(proposal.start),
      end_time: unixToDateTime(proposal.end),
      data: JSON.stringify(data),
    }

    proposalsStorage.push(proposalStorage)
  }

  return proposalsStorage
}

export async function insertGovernanceProposals(client: ClickHouseClient, proposals: GovernanceProposalStorable[]) {
  const values = toStorage(proposals)

  if (values.length === 0) {
    return
  }

  await client.insert({
    table: `${environment.NS_LF}.governance_proposals`,
    values: values,
    format: 'JSONEachRow',
  })
}
