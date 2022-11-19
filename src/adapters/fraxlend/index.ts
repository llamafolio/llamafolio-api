import { Adapter, BaseContext, Contract, GetBalancesHandler, GetContractsHandler } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'

const fraxToken: Token = {
  chain: 'ethereum',
  address: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
  symbol: 'FRAX',
  decimals: 18,
}

let pools = [
  '0x794F6B13FBd7EB7ef10d1ED205c9a416910207Ff',
  '0x32467a5fc2d72D21E8DCe990906547A2b012f382',
  '0xa1D100a5bf6BFd2736837c97248853D989a9ED84',
  '0xDbe88DBAc39263c47629ebbA02b3eF4cf0752A72',
  '0x3835a58CA93Cdb5f912519ad366826aC9a752510',
  '0x50E627a1DF8D665524942aD7eC6392b6BA60293a',
]

const getPools = async (chain: Chain): Promise<Contract[]> => {
  let contracts: Contract[] = []

  try {
    const underlyingToken = await multicall({
      chain,
      calls: pools.map((address) => ({
        target: address,
        params: [],
      })),
      abi: {
        stateMutability: 'view',
        type: 'function',
        name: 'collateralContract',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
      },
    })

    const underlyingTokensAddresses = underlyingToken
      .filter((response) => response.success)
      .map((token) => token.output)

    const [poolsTokens, underlyings] = await Promise.all([
      getERC20Details(chain, pools),
      getERC20Details(chain, underlyingTokensAddresses),
    ])

    for (let i = 0; i < poolsTokens.length; i++) {
      const token = poolsTokens[i]

      const underlying = underlyings[i]

      const poolToken: Contract = {
        chain,
        address: poolsTokens[i].address,
        decimals: token.decimals,
        symbol: token.symbol,
        underlyings: underlying ? [underlying] : undefined,
      }

      contracts.push(poolToken)
    }

    return contracts
  } catch (error) {
    console.log('Failed to get market contract')

    return []
  }
}

const getContracts: GetContractsHandler = async () => {
  const poolsContracts = await getPools('ethereum')

  return {
    contracts: { poolsContracts },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext, { poolsContracts }) => {
  return { balances: [] }
}

const adapter: Adapter = {
  id: 'fraxlend',
  getContracts,
  getBalances,
}

export default adapter
