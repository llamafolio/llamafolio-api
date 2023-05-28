import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  bPool: {
    inputs: [],
    name: 'bPool',
    outputs: [{ internalType: 'contract IBPool', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getCurrentTokens: {
    constant: true,
    inputs: [],
    name: 'getCurrentTokens',
    outputs: [{ internalType: 'address[]', name: 'tokens', type: 'address[]' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getTotalRewardsBalance: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getTotalRewardsBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const AAVE: Contract = {
  name: 'Aave Token',
  address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  chain: 'ethereum',
  symbol: 'AAVE',
  decimals: 18,
}

const ABPT: Contract = {
  name: 'Aave Balance Pool Token',
  address: '0x41A08648C3766F9F9d85598fF102a08f4ef84F84',
  chain: 'ethereum',
  symbol: 'ABPT',
  decimals: 18,
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [amount, rewards] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.getTotalRewardsBalance }),
  ])

  balances.push({
    chain: ctx.chain,
    address: contract.address,
    decimals: contract.decimals,
    symbol: contract.symbol,
    amount,
    category: 'stake',
    underlyings: [{ ...AAVE, amount }],
    rewards: [{ ...AAVE, amount: rewards }],
  })

  return balances
}

export async function getStakeBalancerPoolBalances(
  ctx: BalancesContext,
  stakingContract: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  // staked balancer pool token
  const [bPoolRes, stakedBalance, stakingRewards] = await Promise.all([
    call({ ctx, target: ABPT.address, abi: abi.bPool }),
    call({ ctx, target: stakingContract.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: stakingContract.address, params: [ctx.address], abi: abi.getTotalRewardsBalance }),
  ])

  // Underlyings
  const totalSupplyRes = await multicall({
    ctx,
    calls: [{ target: stakingContract.address }, { target: ABPT.address }],
    abi: erc20Abi.totalSupply,
  })

  if (!totalSupplyRes[0].success || !totalSupplyRes[1].success) {
    console.log('Failed to get totalSupply')
    return []
  }

  const stakingContractLPBalanceRes = await call({
    ctx,
    target: ABPT.address,
    params: [stakingContract.address],
    abi: erc20Abi.balanceOf,
  })

  const underlyingsTokensAddressesRes = await call({ ctx, target: bPoolRes, abi: abi.getCurrentTokens })

  const underlyingsTokensAddresses = underlyingsTokensAddressesRes
  const underlyingsTokens = await getERC20Details(ctx, underlyingsTokensAddresses)
  if (underlyingsTokens.length !== underlyingsTokensAddressesRes.length) {
    console.log('Failed to get underlyings details')
    return []
  }

  const underlyingsBalancesRes = await multicall({
    ctx,
    calls: underlyingsTokens.map((token) => ({ target: token.address, params: [bPoolRes] } as const)),
    abi: erc20Abi.balanceOf,
  })

  const u0Balance = underlyingsBalancesRes[0].success ? underlyingsBalancesRes[0].output : 0n
  const underlying0Balance = {
    chain: ctx.chain,
    address: underlyingsTokens[0].address,
    decimals: underlyingsTokens[0].decimals,
    symbol: underlyingsTokens[0].symbol,
    // staking share * underlying share
    amount:
      (((stakedBalance * stakingContractLPBalanceRes) / totalSupplyRes[0].output) * u0Balance) /
      totalSupplyRes[1].output,
  }
  const u1Balance = underlyingsBalancesRes[1].success ? underlyingsBalancesRes[1].output : 0n
  const underlying1Balance = {
    chain: ctx.chain,
    address: underlyingsTokens[1].address,
    decimals: underlyingsTokens[1].decimals,
    symbol: underlyingsTokens[1].symbol,
    // staking share * underlying share
    amount:
      (((stakedBalance * stakingContractLPBalanceRes) / totalSupplyRes[0].output) * u1Balance) /
      totalSupplyRes[1].output,
  }

  balances.push({
    chain: ctx.chain,
    address: stakingContract.address,
    decimals: stakingContract.decimals,
    symbol: stakingContract.symbol,
    amount: stakedBalance,
    underlyings: [underlying0Balance, underlying1Balance],
    rewards: [{ ...AAVE, amount: stakingRewards }],
    category: 'stake',
  })

  return balances
}
