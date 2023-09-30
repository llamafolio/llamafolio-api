import { selectDistinctAdaptersChains } from '@db/adapters'
import { client } from '@db/clickhouse'
import { type GovernanceProposalStorable, insertGovernanceProposals } from '@db/governance'
import { serverError, success } from '@handlers/response'
import { fromDefiLlamaChain } from '@lib/chains'
import {
  fetchGovernanceCompound,
  fetchGovernanceSnapshot,
  fetchGovernanceTally,
  fetchProtocolGovernanceSnapshot,
} from '@lib/governance'
import { invokeLambda, wrapScheduledLambda } from '@lib/lambda'
import { getProtocolSlug } from '@lib/protocols'
import type { APIGatewayProxyHandler } from 'aws-lambda'

const updateGovernanceProposals: APIGatewayProxyHandler = async () => {
  await invokeLambda('updateGovernanceProposals', {}, 'Event')

  return success({})
}

export const scheduledUpdateGovernanceProposals = wrapScheduledLambda(updateGovernanceProposals)

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const [supportedProtocols, governanceSnapshot, governanceCompound, governanceTally] = await Promise.all([
      selectDistinctAdaptersChains(client),
      fetchGovernanceSnapshot(),
      fetchGovernanceCompound(),
      fetchGovernanceTally(),
    ])

    const governanceSnapshotIds: { id: string; chain: string; protocol: string }[] = []
    const governanceCompoundIds: { id: string; chain: string; protocol: string }[] = []
    const governanceTallyIds: { id: string; chain: string; protocol: string }[] = []

    // Snapshot
    for (const governanceId in governanceSnapshot) {
      const data = governanceSnapshot[governanceId]
      const protocol = getProtocolSlug(data.name)
      const chain = fromDefiLlamaChain[data.chainName]

      if (protocol in supportedProtocols && supportedProtocols[protocol].includes(chain)) {
        governanceSnapshotIds.push({ id: governanceId, protocol, chain })
      } else {
        console.log(`Protocol ${protocol} not supported on chain ${chain}`)
      }
    }

    // Compound
    for (const governanceId in governanceCompound) {
      const data = governanceCompound[governanceId]
      const protocol = getProtocolSlug(data.name)
      const chain = fromDefiLlamaChain[data.chainName]

      if (protocol in supportedProtocols && supportedProtocols[protocol].includes(chain)) {
        governanceCompoundIds.push({ id: governanceId, protocol, chain })
      }
    }

    // Tally
    for (const governanceId in governanceTally) {
      const data = governanceTally[governanceId]
      const protocol = getProtocolSlug(data.name)
      const chain = fromDefiLlamaChain[data.chainName]

      if (protocol in supportedProtocols && supportedProtocols[protocol].includes(chain)) {
        governanceTallyIds.push({ id: governanceId, protocol, chain })
      }
    }

    console.log('Fetching Snapshot protocol governance', governanceSnapshotIds.length)
    console.log('Fetching Compound protocol governance', governanceCompoundIds.length)
    console.log('Fetching Tally protocol governance', governanceTallyIds.length)

    const protocolGovernances = await Promise.allSettled([
      ...governanceSnapshotIds.map(({ id }) => fetchProtocolGovernanceSnapshot(id)),
      ...governanceCompoundIds.map(({ id }) => fetchProtocolGovernanceSnapshot(id)),
      ...governanceTallyIds.map(({ id }) => fetchProtocolGovernanceSnapshot(id)),
    ])

    const proposals: GovernanceProposalStorable[] = []

    // Snapshot
    for (let idx = 0; idx < governanceSnapshotIds.length; idx++) {
      const protocolGovernanceSnapshot = protocolGovernances[idx]
      if (
        !protocolGovernanceSnapshot ||
        protocolGovernanceSnapshot.status === 'rejected' ||
        !protocolGovernanceSnapshot.value
      ) {
        console.log('Failed to fetch Snapshot protocol governance data', governanceSnapshotIds[idx])
        continue
      }

      const { protocol, chain } = governanceSnapshotIds[idx]

      for (const proposalId in protocolGovernanceSnapshot.value.proposals) {
        proposals.push({ ...protocolGovernanceSnapshot.value.proposals[proposalId], protocol, chain })
      }
    }

    // Compound
    for (let idx = 0; idx < governanceCompoundIds.length; idx++) {
      const offset = governanceSnapshotIds.length
      const protocolGovernanceCompound = protocolGovernances[idx + offset]
      if (
        !protocolGovernanceCompound ||
        protocolGovernanceCompound.status === 'rejected' ||
        !protocolGovernanceCompound.value
      ) {
        console.log('Failed to fetch Compound protocol governance data', governanceSnapshotIds[idx])
        continue
      }

      const { protocol, chain } = governanceSnapshotIds[idx]

      for (const proposalId in protocolGovernanceCompound.value.proposals) {
        proposals.push({ ...protocolGovernanceCompound.value.proposals[proposalId], protocol, chain })
      }
    }

    // Tally
    for (let idx = 0; idx < governanceTallyIds.length; idx++) {
      const offset = governanceSnapshotIds.length + governanceCompoundIds.length
      const protocolGovernanceTally = protocolGovernances[idx + offset]
      if (!protocolGovernanceTally || protocolGovernanceTally.status === 'rejected' || !protocolGovernanceTally.value) {
        console.log('Failed to fetch Tally protocol governance data', governanceSnapshotIds[idx])
        continue
      }

      const { protocol, chain } = governanceSnapshotIds[idx]

      for (const proposalId in protocolGovernanceTally.value.proposals) {
        proposals.push({ ...protocolGovernanceTally.value.proposals[proposalId], protocol, chain })
      }
    }

    await insertGovernanceProposals(client, proposals)

    console.log(`Successfully inserted ${proposals.length} proposals`)

    return success({})
  } catch (e) {
    console.log('Failed to update governance proposals', e)
    return serverError('Failed to update governance proposals')
  }
}
