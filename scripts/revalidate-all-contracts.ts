import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

interface Adapter {
  adapter: string
  chains: string[]
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function getAdapters() {
  const src = path.join(__dirname, '..', 'src', 'adapters')

  const adapters: Adapter[] = []

  fs.readdirSync(src).forEach(function (child) {
    const childPath = path.join(src, child)

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(path.join(childPath, 'index.ts'))) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const subFolders = fs
        .readdirSync(childPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory() && dirent.name !== 'common')
        .map((dirent) => dirent.name)

      const adapter: Adapter = {
        adapter: child,
        chains: subFolders,
      }
      adapters.push(adapter)
    }
  })

  return adapters
}

/**
 * Revalidate contracts of all adapters
 */
async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: revalidate-all-contracts.ts

  const adapters = getAdapters()

  // TODO: spawn child processes
  for (const { adapter, chains } of adapters) {
    for (const chain of chains) {
      console.log(`Revalidate contracts ${adapter} ${chain}`)

      try {
        const stdout = execSync(`pnpm run revalidate-contracts ${adapter} ${chain}`, {})
        console.log(stdout.toString())
      } catch (err) {
        console.error(err)
      }
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
