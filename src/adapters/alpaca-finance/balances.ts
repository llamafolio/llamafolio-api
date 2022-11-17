import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers/lib/ethers'

const FairLaunch: Contract = {
  name: 'fairlaunchContractAddress',
  chain: 'bsc',
  address: '0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F',
}

const MiniFL: Contract = {
  name: 'MiniFl',
  chain: 'fantom',
  address: '0x838B7F64Fa89d322C563A6f904851A13a164f84C',
}

const AlpacaBSC: Contract = {
  chain: 'bsc',
  address: '0x8f0528ce5ef7b51152a59745befdd91d97091d2f',
  decimals: 18,
  symbols: 'ALPACA',
}

const AlpacaFTM: Contract = {
  chain: 'fantom',
  address: '0xad996a45fd2373ed0b10efa4a8ecb9de445a4302',
  decimals: 18,
  symbols: 'ALPACA',
}

export async function getFarmingBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]) {
  const balances: Balance[] = []
  const calls = contracts.map((contract) => ({
    target: contract.chain === 'bsc' ? FairLaunch.address : MiniFL.address,
    params: [contract.associatedWithPoolNumber, ctx.address],
  }))

  const [userInfoRes, pendingRewardsRes] = await Promise.all([
    multicall({
      chain,
      calls,
      abi: {
        inputs: [
          { internalType: 'uint256', name: '', type: 'uint256' },
          { internalType: 'address', name: '', type: 'address' },
        ],
        name: 'userInfo',
        outputs: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    multicall({
      chain,
      calls,
      abi: {
        inputs: [
          { internalType: 'uint256', name: '_pid', type: 'uint256' },
          { internalType: 'address', name: '_user', type: 'address' },
        ],
        name: 'pendingAlpaca',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  for (let i = 0; i < contracts.length; i++) {
    if (userInfoRes[i].success && pendingRewardsRes[i].success) {
      const pendingRewards = BigNumber.from(pendingRewardsRes[i].output)

      // division by 0
      if (contracts[i].totalSupply.gt(0)) {
        const amount = BigNumber.from(userInfoRes[i].output.amount)
          .mul(contracts[i].totalToken)
          .div(contracts[i].totalSupply)

        const balance: Balance = {
          ...contracts[i],
          amount,
          underlyings: [{ ...contracts[i].underlyings?.[0], amount }],
          rewards: [
            contracts[i].chain === 'bsc'
              ? { ...AlpacaBSC, amount: pendingRewards }
              : { ...AlpacaFTM, amount: pendingRewards },
          ],
          category: 'farm',
        }
        balances.push(balance)
      }
    }
  }
  return balances
}

export async function getDepositBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]) {
  const balances: Balance[] = []
  const calls = contracts.map((contract) => ({
    target: contract.address,
    params: [ctx.address],
  }))

  const balanceOfRes = await multicall({
    chain,
    calls,
    abi: abi.balanceOf,
  })

  for (let i = 0; i < contracts.length; i++) {
    if (contracts[i].totalSupply.gt(0)) {
      const amount = BigNumber.from(balanceOfRes[i].output).mul(contracts[i].totalToken).div(contracts[i].totalSupply)

      const balance: Balance = {
        ...contracts[i],
        amount,
        underlyings: [{ ...contracts[i].underlyings?.[0], amount }],
        category: 'lp',
      }
      balances.push(balance)
    }
  }
  return balances
}
