import { selectDistinctAdaptersChains } from '@db/adapters'
import { client } from '@db/clickhouse'
import { type GovernanceProposalStorable, insertGovernanceProposals } from '@db/governance'
import { serverError, success } from '@handlers/response'
import { fromDefiLlamaChain } from '@lib/chains'
import { fetchGovernanceSnapshot, fetchProtocolGovernanceSnapshot } from '@lib/governance'
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
    const [supportedProtocols, governanceSnapshot] = await Promise.all([
      selectDistinctAdaptersChains(client),
      fetchGovernanceSnapshot(),
    ])

    const governanceIds: { id: string; chain: string; protocol: string }[] = []

    for (const governanceId in governanceSnapshot) {
      const snapshot = governanceSnapshot[governanceId]
      const protocol = getProtocolSlug(snapshot.name)
      const chain = fromDefiLlamaChain[snapshot.chainName]

      if (protocol in supportedProtocols && supportedProtocols[protocol].includes(chain)) {
        governanceIds.push({ id: governanceId, protocol, chain })
      }
    }

    const protocolGovernanceSnapshots = await Promise.all(
      governanceIds.map(({ id }) => fetchProtocolGovernanceSnapshot(id)),
    )

    const proposals: GovernanceProposalStorable[] = []

    for (let snapshotIdx = 0; snapshotIdx < protocolGovernanceSnapshots.length; snapshotIdx++) {
      const protocolGovernanceSnapshot = protocolGovernanceSnapshots[snapshotIdx]
      if (!protocolGovernanceSnapshot) {
        continue
      }

      const { protocol, chain } = governanceIds[snapshotIdx]

      for (const proposalId in protocolGovernanceSnapshot.proposals) {
        proposals.push({ ...protocolGovernanceSnapshot.proposals[proposalId], protocol, chain })
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
