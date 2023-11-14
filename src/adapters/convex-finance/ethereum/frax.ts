import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  claimableRewards: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimableRewards',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        internalType: 'struct cvxFxnStaking.EarnedData[]',
        name: 'userRewards',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokenLength: {
    inputs: [],
    name: 'rewardTokenLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokens: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewardTokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const cvxFxsStaking: Contract = {
  name: 'cvxFxsStaking',
  chain: 'ethereum',
  address: '0x49b4d1df40442f0c31b1bbaea3ede7c38e37e31a',
  token: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0', // FXS
  underlyings: ['0xfeef77d3f69374f66429c91d732a244f074bdf74'], // cvxFXS
  category: 'stake',
}

export const cvxFpisStaking: Contract = {
  name: 'cvxFpisStaking',
  chain: 'ethereum',
  address: '0xfa87db3eaa93b7293021e38416650d2e666bc483',
  token: '0xc2544a32872a91f4a553b404c6950e89de901fdb', // FPIS
  underlyings: ['0xa2847348b58ced0ca58d23c7e9106a49f1427df6'], // cvxFPIS
  category: 'stake',
}

/**
 * Add staking rewards (the rewards list can be updated by the admin)
 * @param ctx
 * @param contract
 */
export async function getStkCvxFxsContract(ctx: BaseContext, contract: Contract) {
  const rewardTokenLength = await call({ ctx, target: contract.address, abi: abi.rewardTokenLength })
  const rewardsRes = await multicall({
    ctx,
    calls: rangeBI(0n, rewardTokenLength).map((idx) => ({ target: contract.address, params: [idx] }) as const),
    abi: abi.rewardTokens,
  })

  const res: Contract = {
    ...contract,
    rewards: mapSuccessFilter(rewardsRes, (reward) => reward.output),
  }

  return res
}

export async function getStkCvxFxsBalance(ctx: BalancesContext, cvxFxsStaking: Contract) {
  const [balanceOf, claimableRewards] = await Promise.all([
    call({ ctx, target: cvxFxsStaking.address, abi: erc20Abi.balanceOf, params: [ctx.address] }),
    call({ ctx, target: cvxFxsStaking.address, abi: abi.claimableRewards, params: [ctx.address] }),
  ])

  const cvxFxs = cvxFxsStaking.underlyings![0] as Contract

  const rewards = (cvxFxsStaking.rewards as Contract[]).map((reward, idx) => ({
    ...reward,
    amount: claimableRewards[idx]?.amount || 0n,
  }))

  const balance: Balance = {
    ...cvxFxsStaking,
    amount: balanceOf,
    underlyings: [{ ...cvxFxs, amount: balanceOf }],
    rewards,
    category: 'stake',
  }

  return balance
}
