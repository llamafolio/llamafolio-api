import ethersBalances from './ethers.json'
import viemBalances from './viem.json'

const viemBalancesFiltered = viemBalances
  .flat()
  .map(({ balances }) => balances)
  .flat()
// .filter((b) => b.amount.toString() !== '0' && Number(b.amount) > 0)
/* ^^ don't need this last filter since i'm already filtering inside the getERC20BalanceOf function */

const ethersBalancesFiltered = ethersBalances.flat().filter(({ amount }) => amount.hex != '0x00')

console.log(`Count of tokens balances collected: `, {
  etheres: ethersBalancesFiltered.length,
  viem: viemBalancesFiltered.length,
})
