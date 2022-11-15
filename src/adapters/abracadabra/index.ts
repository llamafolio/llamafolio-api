import { Adapter, Balance, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

type Chains = 'ethereum' | 'fantom' | 'avax' /*| "arbitrum"*/

const bentoBoxes: Record<Chains, string> = {
  ethereum: '0xf5bce5077908a1b7370b9ae04adc565ebd643966',
  fantom: '0xf5bce5077908a1b7370b9ae04adc565ebd643966',
  avax: '0xf4f46382c2be1603dc817551ff9a7b333ed1d18f',
  // arbitrum: "0x74c764d41b77dbbb4fe771dab1939b00b146894a",
}

const magicInternetMoneys: Record<Chains, string> = {
  ethereum: '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3',
  fantom: '0x82f0b8b456c1a451378467398982d4834b6829c1',
  avax: '0x130966628846bfd36ff31a822705796e8cb8c18d',
  // arbitrum: "0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a",
}

// chain -> cauldron -> collateral
const markets: Record<Chains, Record<string, string>> = {
  ethereum: {
    '0x7b7473a76d6ae86ce19f7352a1e89f6c9dc39020': '0xdbdb4d16eda451d0503b854cf79d55697f90c8df',
    '0x806e16ec797c69afa8590a55723ce4cc1b54050e': '0xd92494cb921e5c0d3a39ea88d0147bbd82e51008',
    '0x05500e2ee779329698df35760bedcaac046e7c27': '0x4e15361fd6b4bb609fa63c81a2be19d873717870',
    '0x003d5a75d284824af736df51933be522de9eed0f': '0xca76543cf381ebbb277be79574059e32108e3e65',
    '0x98a84eff6e008c5ed0289655ccdca899bcb6b99f': '0x8798249c2e607446efb7ad49ec89dd1865ff4272',
    '0xebfde87310dc22404d918058faa4d56dc4e93f0a': '0x27b7b1ad7288079a66d12350c828d3c00a6f07d7',
    '0x0bca8ebcb26502b013493bf8fe53aa2b1ed401c1': '0xdcd90c7f6324cfa40d7169ef80b12031770b4325',
    '0x6cbafee1fab76ca5b5e144c43b3b50d42b7c8c8f': '0x5f18c75abdae578b483e5f43f12a39cf75b973a9',
    '0x551a7cff4de931f32893c928bbc3d25bf1fc5147': '0x7da96a3891add058ada2e826306d812c638d87a7',
    '0x920d9bd936da4eafb5e25c6bdc9f6cb528953f9f': '0xa258c4606ca8206d8aa700ce2143d7db854d168c',
    '0xffbf4892822e0d552cff317f65e1ee7b5d3d9ae6': '0xe14d13d8b3b85af791b2aadd661cdbd5e6097db1',
    '0x6ff9061bb8f97d948942cef376d98b51fa38b91f': '0xa9fe4601811213c340e850ea305481aff02f5b28',
    '0xbb02a884621fb8f5bfd263a67f58b65df5b090f3': '0x8798249c2e607446efb7ad49ec89dd1865ff4272',
  },
  fantom: {
    '0x8e45af6743422e488afacdad842ce75a09eaed34': '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
    '0xd4357d43545f793101b592bacab89943dc89d11b': '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
  },
  avax: {
    '0x3cfed0439ab822530b1ffbd19536d897ef30d2a2': '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  },
  // arbitrum: {
  //   "0xc89958b03a55b5de2221acb25b58b89a000215e6":
  //     "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  // },
}

async function getChainContracts(chain: Chains) {
  const cauldrons = markets[chain]
  if (!cauldrons) {
    return []
  }

  const underlyings = await getERC20Details(chain, Object.values(cauldrons))
  const underlyingByAddress: { [key: string]: Token } = {}
  for (const underlying of underlyings) {
    underlyingByAddress[underlying.address] = underlying
  }

  const contracts: Contract[] = []
  for (const cauldron in cauldrons) {
    const contract: Contract = {
      chain,
      address: cauldron,
    }

    const underlying = underlyingByAddress[cauldrons[cauldron]]
    if (underlying) {
      contract.underlyings = [underlying]
    }

    contracts.push(contract)
  }

  return contracts
}

async function getChainBalances(ctx: BaseContext, chain: Chains, contracts: Contract[]) {
  const [magicInternetMoneyRes, userBorrowParts, totalBorrows, userCollateralShares] = await Promise.all([
    getERC20Details(chain, [magicInternetMoneys[chain]]),

    multicall({
      chain,
      calls: contracts.map((contract) => ({
        target: contract.address,
        params: [ctx.address],
      })),
      abi: {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'userBorrowPart',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    multicall({
      chain,
      calls: contracts.map((contract) => ({
        target: contract.address,
        params: [],
      })),
      abi: {
        inputs: [],
        name: 'totalBorrow',
        outputs: [
          { internalType: 'uint128', name: 'elastic', type: 'uint128' },
          { internalType: 'uint128', name: 'base', type: 'uint128' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    multicall({
      chain,
      calls: contracts.map((contract) => ({
        target: contract.address,
        params: [ctx.address],
      })),
      abi: {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'userCollateralShare',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const magicInternetMoney = magicInternetMoneyRes[0]

  const lendCalls = []
  const lendCallsContracts = []

  for (let i = 0; i < contracts.length; i++) {
    // filter out errors in calls
    if (!userCollateralShares[i].success) {
      continue
    }

    lendCalls.push({
      target: bentoBoxes[chain],
      params: [contracts[i].underlyings?.[0].address, userCollateralShares[i].output, false],
    })
    lendCallsContracts.push(contracts[i])
  }

  const supplyRes = await multicall({
    chain,
    calls: lendCalls,
    abi: {
      inputs: [
        { internalType: 'contract IERC20', name: 'token', type: 'address' },
        { internalType: 'uint256', name: 'share', type: 'uint256' },
        { internalType: 'bool', name: 'roundUp', type: 'bool' },
      ],
      name: 'toAmount',
      outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const lendBalances: Balance[] = []

  for (let i = 0; i < supplyRes.length; i++) {
    if (supplyRes[i].success) {
      const sup = BigNumber.from(supplyRes[i].output)

      const contract = lendCallsContracts[i]

      if (contract && contract.underlyings?.[0]) {
        lendBalances.push({
          ...contract,
          underlyings: [{ ...contract.underlyings[0], amount: sup }],
          amount: sup,
          category: 'lend',
          rewards: undefined,
        })
      }
    }
  }

  const borrowBalances: Balance[] = []

  // successfully fetched MIM info
  if (magicInternetMoney) {
    for (let i = 0; i < contracts.length; i++) {
      // filter out errors in calls
      if (!userBorrowParts[i].success || !totalBorrows[i].success) {
        continue
      }

      const contract = contracts[i]

      const amount = BigNumber.from(userBorrowParts[i].output)
        .mul(totalBorrows[i].output.elastic)
        .div(totalBorrows[i].output.base)

      borrowBalances.push({
        ...contract,
        underlyings: [{ ...magicInternetMoney, amount }],
        amount,
        category: 'borrow',
        rewards: undefined,
      })
    }
  }

  return [...lendBalances, ...borrowBalances]
}

const getContracts = async () => {
  const chainsConctracts = await Promise.all([
    getChainContracts('ethereum'),
    getChainContracts('fantom'),
    getChainContracts('avax'),
    // getChainContracts("arbitrum"),
  ])

  return {
    contracts: chainsConctracts.flat(),
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const contractsByChain: Record<Chains, Contract[]> = {
    ethereum: [],
    fantom: [],
    avax: [],
    // arbitrum: [],
  }

  for (const contract of contracts) {
    contractsByChain[contract.chain as Chains].push(contract)
  }

  const chainsBalances = await Promise.all([
    getChainBalances(ctx, 'ethereum', contractsByChain['ethereum']),
    getChainBalances(ctx, 'fantom', contractsByChain['fantom']),
    getChainBalances(ctx, 'avax', contractsByChain['avax']),
    // getChainBalances(ctx, "arbitrum", contractsByChain["arbitrum"]),
  ])

  return {
    balances: chainsBalances.flat(),
  }
}

const adapter: Adapter = {
  // DefiLlama slug
  id: 'abracadabra',
  getContracts,
  getBalances,
}

export default adapter
