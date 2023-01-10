import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

function getAdapters() {
  const src = path.join(__dirname, '..', 'src', 'adapters')

  const adapters: string[] = []

  fs.readdirSync(src).forEach(function (child) {
    if (fs.existsSync(path.join(src, child, 'index.ts'))) {
      adapters.push(child)
    }
  })

  return adapters
}

/**
 * Revalidate contracts of all adapters
 */
async function main() {
  // argv[0]: ts-node
  // argv[1]: revalidate-all-contracts.ts

  const adapters = getAdapters()

  // TODO: spawn child processes
  for (const adapter of adapters) {
    console.log(`Revalidate contracts ${adapter}`)
    try {
      const stdout = execSync(`npm run revalidate-contracts ${adapter}`, {})
      console.log(stdout.toString())
    } catch (err) {
      console.error(err)
    }
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
