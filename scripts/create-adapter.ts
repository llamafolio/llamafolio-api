import fs from 'fs'
import path from 'path'

function help() {
  console.log('npm run create-adapter {adapter}')
}

async function main() {
  // argv[0]: ts-node
  // argv[1]: create-adapter.ts
  // argv[2]: adapter
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const name = process.argv[2]
  const src = path.join(__dirname, '..', 'src', 'adapters', '__template')
  const dst = path.join(__dirname, '..', 'src', 'adapters', name)

  const exists = fs.existsSync(dst)

  if (exists) {
    console.error(`Failed to create adapter: ${name} already exists`)
    return
  }

  fs.mkdirSync(dst)
  fs.mkdirSync(path.join(dst, 'ethereum'))
  fs.copyFileSync(path.join(src, 'index.ts'), path.join(dst, 'index.ts'))
  fs.copyFileSync(path.join(src, 'ethereum', 'index.ts'), path.join(dst, 'ethereum', 'index.ts'))

  console.log(`Successfully created adapter. To try it out run:`)
  console.log('')
  console.log(`npm run adapter ${name} ethereum 0x0000000000000000000000000000000000000000`)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
