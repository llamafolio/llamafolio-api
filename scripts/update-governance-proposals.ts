import '@environment'

import { selectDistinctAdaptersChains } from '@db/adapters'
import { client } from '@db/clickhouse'
import { type GovernanceProposalStorable, insertGovernanceProposals } from '@db/governance'
import { fromDefiLlamaChain } from '@lib/chains'
import { fetchGovernanceSnapshot, fetchProtocolGovernanceSnapshot } from '@lib/governance'
import { getProtocolSlug } from '@lib/protocols'

function help() {
  console.log('pnpm run update-governance-proposals')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: update-governance-proposals.ts
  if (process.argv.length < 2) {
    console.error('Missing arguments')
    return help()
  }

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
  } catch (e) {
    console.log('Failed to update governance proposals', e)
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
