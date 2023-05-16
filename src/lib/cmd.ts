import childProcess from 'node:child_process'
import process from 'node:process'

/**
 * Run a command in the shell
 *
 * ```ts
 * await cmd('ls', '-la')
 *
 * await cmd('anvil', '--chain-id=1', '--balance=10000', '--port=8545')
 */
export async function cmd(...command: Array<string>) {
  console.log(command[0])
  const p = childProcess.spawn(command[0], command.slice(1))
  return new Promise((resolve, _reject) => {
    p.stdout.on('data', (data) => {
      process.stdout.write(data.toString())
    })
    p.stderr.on('data', (data) => {
      process.stderr.write(data.toString())
    })
    p.on('error', (error) => {
      console.error({ error })
      process.exit(1)
    })
    p.on('exit', (code) => {
      resolve(code)
    })
  })
}
