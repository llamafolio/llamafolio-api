import { BalancesContext, Contract } from '@lib/adapter'
import { Balance } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const LOOKS: Contract = {
  name: 'LooksRare Token',
  chain: 'ethereum',
  address: '0xf4d2888d29D722226FafA5d9B24F9164c092421E',
  decimals: 18,
  symbols: 'LOOKS',
}

const WETH: Contract = {
  name: 'Wrapped Ether',
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbols: 'WETH',
}

export const getStakeBalances = async (ctx: BalancesContext, stakingContract: Contract) => {
  const [stakeBalanceOfRes, rewardsBalanceOfRes] = await Promise.all([
    call({
      ctx,
      target: stakingContract.address,
      params: ctx.address,
      abi: {
        inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
        name: 'calculateSharesValueInLOOKS',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      ctx,
      target: stakingContract.address,
      params: ctx.address,
      abi: {
        inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
        name: 'calculatePendingRewards',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const stakeBalanceOf = BigNumber.from(stakeBalanceOfRes.output)
  const rewardsBalanceOf = BigNumber.from(rewardsBalanceOfRes.output)

  const stakebalance: Balance = {
    chain: ctx.chain,
    address: LOOKS.address,
    decimals: LOOKS.decimals,
    symbol: LOOKS.symbols,
    amount: stakeBalanceOf,
    rewards: [{ ...WETH, amount: rewardsBalanceOf }],
    category: 'stake',
  }

  return stakebalance
}

export const getCompounderBalances = async (ctx: BalancesContext, compounder: Contract) => {
  const sharesValue = await call({
    chain: ctx.chain,
    target: compounder.address,
    params: [ctx.address],
    abi: {
      inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
      name: 'calculateSharesValueInLOOKS',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const compounderBalance: Balance = {
    chain: ctx.chain,
    address: LOOKS.address,
    decimals: LOOKS.decimals,
    symbol: LOOKS.symbols,
    amount: BigNumber.from(sharesValue.output),
    yieldKey: compounder.address,
    category: 'farm',
  }

  return compounderBalance
}
