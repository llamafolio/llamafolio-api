import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

import { fromDefiLlamaChain } from '@lib/chains'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function getAdapters() {
  const src = path.join(__dirname, '..', 'src', 'adapters')

  const adapters: string[] = []

  fs.readdirSync(src).forEach(function (child) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
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
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: revalidate-all-contracts.ts

  const adapters = getAdapters()

  // for (const adapter of adapters) {
  //   console.log(adapter)
  //   try {
  //     const res = await fetch(`https://api.llama.fi/updatedProtocol/${adapter}`)
  //     const json = await res.json()
  //     const dst = path.join(__dirname, '..', 'src', 'adapters', adapter, `tvl.json`)
  //     console.log(dst)
  //     fs.writeFileSync(dst, JSON.stringify(json, null, 2), 'utf8')

  //     await sleep(3_000)
  //   } catch (err) {
  //     console.error(`${adapter} failed`)
  //     console.log(err)
  //   }
  // }

  for (const adapter of adapters) {
    console.log(adapter)
    try {
      const dst = path.join(__dirname, '..', 'src', 'adapters', adapter, `tvl.json`)
      const buff = fs.readFileSync(dst, 'utf8')
      const json = JSON.parse(buff)

      const startDate = {}

      if (json.chainTvls) {
        for (const key in json.chainTvls) {
          if (json.chains) {
            for (const chain of json.chains) {
              if (key.startsWith(chain)) {
                const _chain = fromDefiLlamaChain[chain]
                const date = json.chainTvls[key].tvl?.[0]?.date
                if (_chain != null && !startDate[_chain] && date != null) {
                  startDate[_chain] = date
                  // const dst2 = path.join(__dirname, '..', 'src', 'adapters', adapter, `start_date.json`)
                  // fs.writeFileSync(dst2, JSON.stringify(startDate, null, 2), 'utf8')
                  const dst3 = path.join(__dirname, '..', 'src', 'adapters', adapter, _chain, 'index.ts')

                  const data = fs.readFileSync(dst3)
                  const fd = fs.openSync(dst3, 'w+')
                  const prefix = Buffer.from(`import type { AdapterConfig } from "@lib/adapter";`)
                  const suffix = Buffer.from(`
                  export const config: AdapterConfig = {
                    startDate: ${date},
                  }
                  `)
                  fs.writeSync(fd, prefix, 0, prefix.length, 0)
                  fs.writeSync(fd, data, 0, data.length, prefix.length)
                  fs.writeSync(fd, suffix, 0, suffix.length, prefix.length + data.length)

                  fs.close(fd, (err) => {
                    if (err) throw err
                  })
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`${adapter} failed`)
      console.log(err)
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
