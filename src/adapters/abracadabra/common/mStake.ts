import { call } from '@defillama/sdk/build/abi'
import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { BigNumber } from 'ethers'

export async function getMStakeContract(chain: Chain, contract?: Contract) {
  const contracts: Contract[] = []

  if (!contract) {
    console.log('Missing or incorrect contract')

    return []
  }

  try {
    const [underlyingTokenAddressRes, rewardTokenAddressRes] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [],
        abi: {
          inputs: [],
          name: 'spell',
          outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
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
          name: 'mim',
          outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
          stateMutability: 'view',
          type: 'function',
        },
      }),
    ])

    const [underlyings, rewards] = await Promise.all([
      getERC20Details(chain, [underlyingTokenAddressRes.output]),
      getERC20Details(chain, [rewardTokenAddressRes.output]),
    ])

    const stakeContract: Contract = {
      ...contract,
      underlyings,
      rewards,
    }
    contracts.push(stakeContract)

    return contracts
  } catch (error) {
    console.log('Failed to get mStake contract')

    return []
  }
}

export async function getMStakeBalance(ctx: BaseContext, chain: Chain, contracts: Contract[]) {
  const balances: Balance[] = []
  const contract = contracts[0]
  const underlying = contract.underlyings?.[0]
  const reward = contract.rewards?.[0]

  try {
    const [balanceOfRes, pendingRewardsRes] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: {
          inputs: [{ internalType: 'address', name: '', type: 'address' }],
          name: 'userInfo',
          outputs: [
            { internalType: 'uint128', name: 'amount', type: 'uint128' },
            { internalType: 'uint128', name: 'rewardDebt', type: 'uint128' },
            { internalType: 'uint128', name: 'lastAdded', type: 'uint128' },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      }),

      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: {
          inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
          name: 'pendingReward',
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      }),
    ])

    const balanceOf = BigNumber.from(balanceOfRes.output.amount)
    const pendingRewards = BigNumber.from(pendingRewardsRes.output)

    if (contract && underlying && reward) {
      const balance: Balance = {
        ...contract,
        amount: balanceOf,
        underlyings: [{ ...underlying, amount: balanceOf }],
        rewards: [{ ...reward, amount: pendingRewards }],
        category: 'stake',
      }

      balances.push(balance)
    }
    return balances
  } catch (error) {
    console.log('Failed to get mStake balance')

    return []
  }
}
