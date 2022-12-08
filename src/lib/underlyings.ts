import { Balance, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { BigNumber } from 'ethers'

const abi = {
  totalSupply: {
    stateMutability: 'view',
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    gas: 3240,
  },

  underlyingsBalances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
}

export async function getUnderlyingsBalancesInPoolsFromLPTokensBalances(
  chain: Chain,
  contracts: Contract[],
  lpTokensAddresses: string[],
  poolsAddresses: string[],
  registry: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i]
    const lpTokenAddress = lpTokensAddresses[i]
    const poolAddress = poolsAddresses[i]

    const [getTotalSupply, getUnderlyingsBalances, underlyings] = await Promise.all([
      call({
        chain,
        target: lpTokenAddress,
        params: [],
        abi: abi.totalSupply,
      }),

      call({
        chain,
        target: registry.address,
        params: [poolAddress],
        abi: abi.underlyingsBalances,
      }),

      getERC20Details(chain, contract.underlyings as any[]),
    ])

    const totalSupply = BigNumber.from(getTotalSupply.output)

    // const underlyingsBalances = BigNumber.from(getUnderlyingsBalances.output.map((res) => BigNumber.from(res.output))

    /**
     *  Updating pool amounts from the fraction of each underlyings
     */

    const underlyingsFractionated = []

    for (let j = 0; j < getUnderlyingsBalances.output.length; j++) {
      const underlyingBalance = BigNumber.from(getUnderlyingsBalances.output[j])
      const underlying = underlyings[j]

      underlyingsFractionated.push({
        ...underlying,
        amount: contract.amount.mul(underlyingBalance).div(totalSupply),
        decimals: underlying.decimals,
      })
    }

    balances.push({
      chain,
      address: contract.address,
      amount: contract.amount,
      symbol: underlyings.map((underlying) => underlying.symbol).join('-'),
      underlyings: underlyingsFractionated,
      decimals: 18,
    })
  }

  return balances
}
