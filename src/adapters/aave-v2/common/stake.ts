import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

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

  const [balanceOfRes, rewardsRes] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
        name: 'getTotalRewardsBalance',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const amount = BigNumber.from(balanceOfRes)
  const rewards = BigNumber.from(rewardsRes)

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

  const [bPoolRes, stakingBalanceOfRes, stakingRewardsRes] = await Promise.all([
    call({
      ctx,
      target: ABPT.address,
      abi: {
        inputs: [],
        name: 'bPool',
        outputs: [{ internalType: 'contract IBPool', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      ctx,
      target: stakingContract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    call({
      ctx,
      target: stakingContract.address,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
        name: 'getTotalRewardsBalance',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  // staked balancer pool token
  const stakedBalance = BigNumber.from(stakingBalanceOfRes)
  const stakingRewards = BigNumber.from(stakingRewardsRes)

  // Underlyings
  const totalSupplyRes = await multicall({
    ctx,
    calls: [{ target: stakingContract.address }, { target: ABPT.address }],
    abi: {
      inputs: [],
      name: 'totalSupply',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  if (!totalSupplyRes[0].success || !totalSupplyRes[1].success) {
    console.log('Failed to get totalSupply')
    return []
  }

  const stakingContractLPBalanceRes = await call({
    ctx,
    target: ABPT.address,
    params: [stakingContract.address],
    abi: {
      constant: true,
      inputs: [{ internalType: 'address', name: '', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  })

  const underlyingsTokensAddressesRes = await call({
    ctx,
    target: bPoolRes,
    abi: {
      constant: true,
      inputs: [],
      name: 'getCurrentTokens',
      outputs: [{ internalType: 'address[]', name: 'tokens', type: 'address[]' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  })

  const underlyingsTokensAddresses = underlyingsTokensAddressesRes
  const underlyingsTokens = await getERC20Details(ctx, underlyingsTokensAddresses)
  if (underlyingsTokens.length !== underlyingsTokensAddressesRes.length) {
    console.log('Failed to get underlyings details')
    return []
  }

  const underlyingsBalancesRes = await multicall({
    ctx,
    calls: underlyingsTokens.map(
      (token) =>
        ({
          target: token.address,
          params: [bPoolRes],
        } as const),
    ),
    abi: {
      constant: true,
      inputs: [{ internalType: 'address', name: '', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    } as const,
  })

  const underlying0Balance = {
    chain: ctx.chain,
    address: underlyingsTokens[0].address,
    decimals: underlyingsTokens[0].decimals,
    symbol: underlyingsTokens[0].symbol,
    // staking share * underlying share
    amount: stakedBalance
      .mul(stakingContractLPBalanceRes)
      .div(totalSupplyRes[0].output)
      .mul(underlyingsBalancesRes[0].success ? underlyingsBalancesRes[0].output : 0n)
      .div(totalSupplyRes[1].output),
  }
  const underlying1Balance = {
    chain: ctx.chain,
    address: underlyingsTokens[1].address,
    decimals: underlyingsTokens[1].decimals,
    symbol: underlyingsTokens[1].symbol,
    // staking share * underlying share
    amount: stakedBalance
      .mul(stakingContractLPBalanceRes)
      .div(totalSupplyRes[0].output)
      .mul(underlyingsBalancesRes[1].success ? underlyingsBalancesRes[1].output : 0n)
      .div(totalSupplyRes[1].output),
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
