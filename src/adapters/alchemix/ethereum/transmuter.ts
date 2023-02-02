import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  accounts: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'accounts',
    outputs: [
      { internalType: 'int256', name: 'debt', type: 'int256' },
      { internalType: 'address[]', name: 'depositedTokens', type: 'address[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  totalValue: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'totalValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const DAI: Token = {
  chain: 'ethereum',
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  decimals: 18,
  symbol: 'DAI',
}

const USDC: Token = {
  chain: 'ethereum',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
}

const USDT: Token = {
  chain: 'ethereum',
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  decimals: 6,
  symbol: 'USDT',
}

const WETH: Token = {
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbol: 'WETH',
}

const daiTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xA840C73a004026710471F727252a9a2800a5197F',
  underlyings: [DAI],
}

const usdcTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x49930AD9eBbbc0EB120CCF1a318c3aE5Bb24Df55',
  underlyings: [USDC],
}

const usdtTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xfC30820ba6d045b95D13a5B8dF4fB0E6B5bdF5b9',
  underlyings: [USDT],
}

const ydaiTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xdA816459F1AB5631232FE5e97a05BBBb94970c95',
  underlyings: [DAI],
}

const yusdcTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE',
  underlyings: [USDC],
}

const yusdtTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x7Da96a3891Add058AdA2E826306D812C638D87a7',
  underlyings: [USDT],
}

const wethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x03323143a5f0D0679026C2a9fB6b0391e4D64811',
  underlyings: [WETH],
}

const ywethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xa258C4606Ca8206D8aA700cE2143D7db854D168c',
  underlyings: [WETH],
}

const wstethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  underlyings: [WETH],
}

const rethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xae78736Cd615f374D3085123A210448E74Fc6393',
  underlyings: [WETH],
}

const reactives = [
  daiTransmuter,
  usdcTransmuter,
  usdtTransmuter,
  ydaiTransmuter,
  yusdcTransmuter,
  yusdtTransmuter,
  wethTransmuter,
  ywethTransmuter,
  wstethTransmuter,
  rethTransmuter,
]

interface getTransmutationBalancesParams extends Balance {
  reactiveToken: string
}

export async function getTransmutationBalances(ctx: BalancesContext, transmuters: Contract[]): Promise<Balance[]> {
  const synthetics: Balance[] = []

  const calls: Call[] = []
  for (let idx = 0; idx < transmuters.length; idx++) {
    const transmuter = transmuters[idx]
    calls.push({ target: transmuter.address, params: [ctx.address] })
  }

  const [accountsRes, totalValuesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.accounts }),
    multicall({ ctx, calls, abi: abi.totalValue }),
  ])

  const reactivesDetailsByAddress: { [key: string]: Contract } = {}
  for (const reactive of reactives) {
    reactivesDetailsByAddress[reactive.address.toLowerCase()] = reactive
  }

  for (let idx = 0; idx < transmuters.length; idx++) {
    const transmuter = transmuters[idx]
    const borrow = transmuter.underlyings?.[0]
    const accountRes = accountsRes[idx]
    const totalValueRes = totalValuesRes[idx]

    if (!isSuccess(accountRes) || !accountRes.output.depositedTokens[0]) {
      continue
    }

    const synthetic: getTransmutationBalancesParams = {
      ...(borrow as Contract),
      amount: BigNumber.from(accountRes.output.debt),
      reactiveToken: accountRes.output.depositedTokens[0].toLowerCase(),
      underlyings: undefined,
      rewards: undefined,
      category: 'borrow',
    }

    const reactiveDetails = reactivesDetailsByAddress[synthetic.reactiveToken.toLowerCase()]
    const underlyings = reactiveDetails.underlyings?.[0] as Contract

    if (!isSuccess(totalValueRes)) {
      continue
    }

    if (underlyings) {
      const reactive: Balance = {
        ...reactiveDetails,
        symbol: underlyings.symbol,
        amount: BigNumber.from(totalValueRes.output),
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
      }

      synthetics.push(synthetic, reactive)
    }
  }
  return synthetics
}
