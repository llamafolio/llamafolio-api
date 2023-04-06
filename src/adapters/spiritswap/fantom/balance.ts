import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { Call, multicall } from '@lib/multicall'
import { isNotNullish, isSuccess } from '@lib/type'
import { Pair } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  tokens: {
    inputs: [],
    name: 'tokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getGauge: {
    inputs: [{ internalType: 'address', name: '_token', type: 'address' }],
    name: 'getGauge',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const getGaugesContracts = async (ctx: BaseContext, pairs: Pair[], gaugeController: Contract): Promise<Contract[]> => {
  const gauges: Contract[] = []

  const lpTokensRes = await call({ ctx, target: gaugeController.address, params: [], abi: abi.tokens })

  const lpTokens = lpTokensRes.output

  const calls: Call[] = []
  for (let idx = 0; idx < lpTokens.length; idx++) {
    calls.push({ target: gaugeController.address, params: [lpTokens[idx]] })
  }

  const gaugesRes = await multicall({ ctx, calls, abi: abi.getGauge })

  for (let gaugeIdx = 0; gaugeIdx < gaugesRes.length; gaugeIdx++) {
    const gaugeRes = gaugesRes[gaugeIdx]
    if (!isSuccess(gaugeRes)) {
      continue
    }

    gauges.push({
      chain: ctx.chain,
      address: gaugeRes.input.params[0],
      lpToken: gaugeRes.input.params[0],
      gauge: gaugeRes.output,
    })
  }

  const pairByAddress: { [key: string]: Contract } = {}
  for (const pair of pairs) {
    pairByAddress[pair.address.toLowerCase()] = pair
  }

  const gaugesPools = gauges
    .map((gauge) => {
      const pair = pairByAddress[gauge.lpToken.toLowerCase()]

      if (!pair) {
        return null
      }

      const contract: Contract = { ...pair, category: 'farm', gauge: gauge.gauge }
      return contract
    })
    .filter(isNotNullish)

  return gaugesPools
}

export async function getGaugesBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  gaugeController: Contract,
): Promise<Balance[]> {
  const gaugesBalances: Balance[] = []
  const gaugesContracts = await getGaugesContracts(ctx, pairs, gaugeController)

  const calls: Call[] = []
  for (let gaugeIdx = 0; gaugeIdx < gaugesContracts.length; gaugeIdx++) {
    calls.push({ target: gaugesContracts[gaugeIdx].gauge, params: [ctx.address] })
  }

  const balancesOfRes = await multicall({ ctx, calls, abi: erc20Abi.balanceOf })

  for (let idx = 0; idx < balancesOfRes.length; idx++) {
    const gaugesContract = gaugesContracts[idx]
    const balanceOfRes = balancesOfRes[idx]

    if (!isSuccess(balanceOfRes)) {
      continue
    }

    gaugesBalances.push({
      ...gaugesContract,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings: gaugesContract.underlyings as Contract[],
      rewards: undefined,
      category: 'farm',
    })
  }

  return getUnderlyingBalances(ctx, gaugesBalances)
}
