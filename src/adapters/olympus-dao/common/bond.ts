import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  bondDetails: {
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
  pendingPayoutFor: {
    inputs: [{ internalType: 'address', name: '_depositor', type: 'address' }],
    name: 'pendingPayoutFor',
    outputs: [{ internalType: 'uint256', name: 'pendingPayout_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  token0: {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token1: {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getReserves: {
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
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getBondsContracts(chain: Chain, contract: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const bondDetailsRes = await multicall({
    chain,
    calls: range(0, 25).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: abi.bondDetails,
  })

  for (let i = 0; i < bondDetailsRes.length; i++) {
    if (!isSuccess(bondDetailsRes[i])) {
      continue
    }
    const bondDetail = bondDetailsRes[i]

    const userSuppliedToken = bondDetail.output._principleToken
    const bondWithToken = bondDetail.output._payoutToken
    const bondAddress = bondDetail.output._bondAddress

    const bondContract: Contract = {
      chain,
      address: userSuppliedToken,
      bondAddress,
      bondWithToken,
      underlyings: [],
      category: 'vest',
    }

    const underlyings = await getPoolsUnderlyings(chain, userSuppliedToken)
    if (underlyings.length > 0) {
      bondContract.underlyings = underlyings
    }
    contracts.push(bondContract)
  }

  return contracts
}

const getPoolsUnderlyings = async (chain: Chain, contracts: string) => {
  const calls = [contracts].map((contract) => ({
    target: contract,
    params: [],
  }))

  const [underlyingToken0AddressesRes, underlyingsTokens1AddressesRes] = await Promise.all([
    multicall({ chain, calls, abi: abi.token0 }),
    multicall({ chain, calls, abi: abi.token1 }),
  ])

  const underlyings0 = underlyingToken0AddressesRes.filter((res) => res.success).map((res) => res.output)
  const underlyings1 = underlyingsTokens1AddressesRes.filter((res) => res.success).map((res) => res.output)

  return [...underlyings0, ...underlyings1]
}

export async function getBondsBalances(ctx: BalancesContext, chain: Chain, contracts: Contract[]) {
  const balances: Balance[] = []

  const pendingPayoutForRes = await multicall({
    chain,
    calls: contracts.map((contract) => ({
      target: contract.bondAddress,
      params: [ctx.address],
    })),
    abi: abi.pendingPayoutFor,
  })

  const pendingPayoutFor = pendingPayoutForRes.filter(isSuccess).map((res) => BigNumber.from(res.output))

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i]
    const pendingPayout = pendingPayoutFor[i]

    const balance: Balance = {
      ...contract,
      amount: pendingPayout,
      rewards: undefined,
    }

    if (contract.underlyings && contract.symbol === 'SLP') {
      const underlyingsBalances = await getUnderlyingsBalances(chain, balance)
      balance.underlyings = underlyingsBalances
    }
    balances.push(balance)
  }

  return balances
}

const getUnderlyingsBalances = async (chain: Chain, contract: Contract) => {
  const underlyings = []

  if (contract.underlyings) {
    const [underlyingsTokensReservesRes, totalPoolSupplyRes] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [],
        abi: abi.getReserves,
      }),

      call({
        chain,
        target: contract.address,
        params: [],
        abi: abi.totalSupply,
      }),
    ])

    const underlyingsTokensReserves0 = BigNumber.from(underlyingsTokensReservesRes.output._reserve0)
    const underlyingsTokensReserves1 = BigNumber.from(underlyingsTokensReservesRes.output._reserve1)
    const totalPoolSupply = BigNumber.from(totalPoolSupplyRes.output)

    const underlyings0 = {
      ...contract.underlyings[0],
      amount: contract.amount.mul(underlyingsTokensReserves0).div(totalPoolSupply),
    }

    const underlyings1 = {
      ...contract.underlyings[1],
      amount: contract.amount.mul(underlyingsTokensReserves1).div(totalPoolSupply),
    }

    underlyings.push(underlyings0, underlyings1)

    return underlyings
  }
}
