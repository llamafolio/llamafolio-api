import { parseAddress } from '@lib/fmt'

import type { LabelSource } from '../src/labels'
import { fetchENSName } from '../src/labels/ens'
import { fetchLlamaFolioLabel } from '../src/labels/llamafolio'
import { fetchOpenSeaUser } from '../src/labels/opensea'

interface Label {
  label: string
  source: LabelSource
  type: string
}

function help() {
  console.log('pnpm run find-user {address}')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: find-user.ts
  // argv[2]: address
  if (process.argv.length < 2) {
    console.error('Missing user argument')
    return help()
  }

  const address = parseAddress(process.argv[2] || '')
  if (!address) {
    console.error('Invalid address parameter')
    return help()
  }

  const [llamaFolioLabels, openSea, ens] = await Promise.all([
    fetchLlamaFolioLabel(address),
    fetchOpenSeaUser(address),
    fetchENSName(address),
  ])

  const foundNames: Label[] = []
  const foundLinks: Label[] = []

  if (llamaFolioLabels) {
    if (llamaFolioLabels.labels) {
      for (const label of llamaFolioLabels.labels) {
        foundNames.push({
          label,
          source: 'llamafolio',
          type: 'label',
        })
      }
    }

    if (llamaFolioLabels.links) {
      for (const key in llamaFolioLabels.links) {
        foundLinks.push({
          source: 'llamafolio',
          label: llamaFolioLabels.links[key],
          type: key,
        })
      }
    }
  }

  if (openSea) {
    foundNames.push({
      source: 'opensea',
      type: 'label',
      label: openSea,
    })
  }

  if (ens) {
    foundNames.push({
      source: 'ens',
      type: 'label',
      label: ens,
    })
  }

  if (foundNames.length > 0) {
    console.log('Found labels: ')
    console.table(foundNames)
  }

  if (foundLinks.length > 0) {
    console.log('Found links: ')
    console.table(foundLinks)
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
