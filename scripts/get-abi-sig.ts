import { shortAddress } from '@lib/fmt'
import { promises as fs } from 'fs'
import path from 'path'
import { getEventSelector, getEventSignature, getFunctionSelector, getFunctionSignature } from 'viem'

async function help() {
  console.log('Usage: npm run get-abi-sig -- abiName')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: get-abi-sig.ts
  // argv[2]: abi
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const abiName = process.argv[2]
  const abiPath = path.join(__dirname, 'abis', `${abiName}.json`)

  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const abiContent = await fs.readFile(abiPath, 'utf8')
    let abis = JSON.parse(abiContent)
    abis = normalizeAbi(abis)
    const sigs = []

    for (const functionOrEvent of abis) {
      const type = functionOrEvent.type
      if (type === 'event') {
        const signature = getEventSignature(functionOrEvent)
        const selector = getEventSelector(signature)
        const short_selector = shortAddress(selector)
        sigs.push({ name: functionOrEvent.name, type, signature, selector, short_selector })
      } else if (type === 'function') {
        const signature = getFunctionSignature(functionOrEvent)
        const selector = getFunctionSelector(signature)
        const short_selector = shortAddress(selector)
        sigs.push({ name: functionOrEvent.name, type, signature, selector, short_selector })
      }
    }

    console.table(sigs)
  } catch (e) {
    console.error('Failed to get contract sigs', e)
  }
}

function normalizeAbi(abi: any) {
  if (abi.length > 0 && typeof abi[0] === 'object' && !abi[0].inputs) {
    return abi.map((obj: any) => Object.values(obj)[0])
  } else {
    return abi
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
