import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

export async function getBondsBalances(ctx: BalancesContext, chain: Chain, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const bondDetailsRes = await multicall({
    chain,
    calls: range(0, 25).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: {
      inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      name: 'bondDetails',
      outputs: [
        { internalType: 'address', name: '_payoutToken', type: 'address' },
        { internalType: 'address', name: '_principleToken', type: 'address' },
        { internalType: 'address', name: '_treasuryAddress', type: 'address' },
        { internalType: 'address', name: '_bondAddress', type: 'address' },
        { internalType: 'address', name: '_initialOwner', type: 'address' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const userSuppliedTokenAddresses = bondDetailsRes
    .filter((res) => res.success)
    .map((res) => res.output._principleToken)

  const bondWithTokenAddresses = bondDetailsRes.filter((res) => res.success).map((res) => res.output._payoutToken)
  const bondAddresses = bondDetailsRes.filter((res) => res.success).map((res) => res.output._bondAddress)

  const [userSuppliedTokens, bondWithTokens] = await Promise.all([
    getERC20Details(chain, userSuppliedTokenAddresses),
    getERC20Details(chain, bondWithTokenAddresses),
  ])

  const bondContractsInfos = []

  for (let i = 0; i < userSuppliedTokens.length; i++) {
    const userSuppliedToken = userSuppliedTokens[i]
    const bondWithToken = bondWithTokens[i]
    const bondAddress = bondAddresses[i]

    bondContractsInfos.push({ userSuppliedToken, bondWithToken, bondAddress })
  }

  const pendingPayoutForRes = await multicall({
    chain,
    calls: bondContractsInfos.map((bond) => ({
      target: bond.bondAddress,
      params: [ctx.address],
    })),
    abi: {
      inputs: [{ internalType: 'address', name: '_depositor', type: 'address' }],
      name: 'pendingPayoutFor',
      outputs: [{ internalType: 'uint256', name: 'pendingPayout_', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const pendingPayoutFor = pendingPayoutForRes.filter((res) => res.success).map((res) => BigNumber.from(res.output))

  for (let i = 0; i < bondContractsInfos.length; i++) {
    const bondContractInfo = bondContractsInfos[i]
    const pendingPayout = pendingPayoutFor[i]

    const balance: Balance = {
      ...bondContractInfo.userSuppliedToken,
      amount: pendingPayout,
      category: 'vest',
    }
    if (balance.amount.gt(0) && balance.symbol === 'SLP') {
      const underlyings = await getPoolsUnderlyings(chain, balance)
      balance.underlyings = [...underlyings]
    }
    balances.push(balance)
  }

  return balances
}

const getPoolsUnderlyings = async (chain: Chain, contract: Contract): Promise<Balance[]> => {
  const [
    underlyingToken0AddressesRes,
    underlyingsTokens1AddressesRes,
    underlyingsTokensReservesRes,
    totalPoolSupplyRes,
  ] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'token0',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'token1',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'getReserves',
        outputs: [
          { internalType: 'uint112', name: '_reserve0', type: 'uint112' },
          { internalType: 'uint112', name: '_reserve1', type: 'uint112' },
          { internalType: 'uint32', name: '_blockTimestampLast', type: 'uint32' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const underlyingsTokensAddresses: string[] = []
  const underlyingsTokensReserves: BigNumber[] = []
  const totalPoolSupply = BigNumber.from(totalPoolSupplyRes.output)

  underlyingsTokensAddresses.push(underlyingToken0AddressesRes.output, underlyingsTokens1AddressesRes.output)
  underlyingsTokensReserves.push(
    BigNumber.from(underlyingsTokensReservesRes.output._reserve0),
    BigNumber.from(underlyingsTokensReservesRes.output._reserve1),
  )
  const underlyings = await getERC20Details(chain, underlyingsTokensAddresses)

  const underlyings0 = {
    ...underlyings[0],
    amount: contract.amount.mul(underlyingsTokensReserves[0]).div(totalPoolSupply),
  }
  const underlyings1 = {
    ...underlyings[1],
    amount: contract.amount.mul(underlyingsTokensReserves[1]).div(totalPoolSupply),
  }

  return [underlyings0, underlyings1]
}
