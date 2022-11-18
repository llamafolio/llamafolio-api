import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
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

export async function getStakeBalances(ctx: BaseContext, chain: Chain, contract?: Contract) {
  if (!contract || !contract.underlyings?.[0] || !contract.rewards?.[0]) {
    return []
  }

  try {
    const balances: Balance[] = []

    const [balanceOfRes, rewardsRes] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: abi.balanceOf,
      }),

      call({
        chain,
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

    const amount = BigNumber.from(balanceOfRes.output)
    const rewards = BigNumber.from(rewardsRes.output)

    const balance: Balance = {
      chain,
      address: contract.address,
      decimals: contract.decimals,
      symbol: contract.symbol,
      amount,
      category: 'stake',
      underlyings: [{ ...contract.underlyings?.[0], amount }],
      rewards: [{ ...contract.rewards?.[0], amount: rewards }],
    }
    balances.push(balance)

    return balances
  } catch (error) {
    return []
  }
}

export async function getStakeBalancerPoolBalances(ctx: BaseContext, chain: Chain, stakingContract?: Contract) {
  if (!stakingContract || !stakingContract.underlyings?.[0]) {
    return []
  }

  const underlyingContract: Contract = stakingContract.underlyings?.[0]

  try {
    const balances: Balance[] = []

    const [bPoolRes, stakingBalanceOfRes, stakingRewardsRes] = await Promise.all([
      call({
        chain,
        target: underlyingContract.address,
        abi: {
          inputs: [],
          name: 'bPool',
          outputs: [{ internalType: 'contract IBPool', name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function',
        },
      }),

      call({
        chain,
        target: stakingContract.address,
        params: [ctx.address],
        abi: abi.balanceOf,
      }),

      call({
        chain,
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
    const stakedBalance = BigNumber.from(stakingBalanceOfRes.output)
    const stakingRewards = BigNumber.from(stakingRewardsRes.output)

    // Underlyings
    const totalSupplyRes = await multicall({
      chain,
      calls: [{ target: stakingContract.address }, { target: underlyingContract.address }],
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
      chain,
      target: underlyingContract.address,
      params: stakingContract.address,
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
      chain,
      target: bPoolRes.output,
      params: [],
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

    const underlyingsTokensAddresses = underlyingsTokensAddressesRes.output
    const underlyingsTokens = await getERC20Details(chain, underlyingsTokensAddresses)
    if (underlyingsTokens.length !== underlyingsTokensAddressesRes.output.length) {
      console.log('Failed to get underlyings details')
      return []
    }

    const underlyingsBalancesRes = await multicall({
      chain,
      calls: underlyingsTokens.map((token) => ({
        target: token.address,
        params: [bPoolRes.output],
      })),
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

    const underlying0Balance: Balance = {
      chain,
      address: underlyingsTokens[0].address,
      decimals: underlyingsTokens[0].decimals,
      symbol: underlyingsTokens[0].symbol,
      // staking share * underlying share
      amount: stakedBalance
        .mul(stakingContractLPBalanceRes.output)
        .div(totalSupplyRes[0].output)
        .mul(underlyingsBalancesRes[0].output)
        .div(totalSupplyRes[1].output),
    }
    const underlying1Balance: Balance = {
      chain,
      address: underlyingsTokens[1].address,
      decimals: underlyingsTokens[1].decimals,
      symbol: underlyingsTokens[1].symbol,
      // staking share * underlying share
      amount: stakedBalance
        .mul(stakingContractLPBalanceRes.output)
        .div(totalSupplyRes[0].output)
        .mul(underlyingsBalancesRes[1].output)
        .div(totalSupplyRes[1].output),
    }

    const balance: Balance = {
      chain,
      address: stakingContract.address,
      decimals: stakingContract.decimals,
      symbol: stakingContract.symbol,
      amount: stakedBalance,
      underlyings: [underlying0Balance, underlying1Balance],
      rewards: [{ ...AAVE, amount: stakingRewards }],
      category: 'stake',
    }

    balances.push(balance)

    return balances
  } catch (error) {
    console.log('getStakeBalancerPoolBalances failed', error)
    return []
  }
}
