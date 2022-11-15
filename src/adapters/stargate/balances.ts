import { Balance, BaseContext, Contract } from '@lib/adapter'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { providers } from '@lib/providers'
import { BigNumber, ethers } from 'ethers'

import MasterChefAbi from './abis/MasterChef.json'

export async function getStakeBalances(ctx: BaseContext, contracts: Contract[]): Promise<Balance[]> {
  const balances = []
  for (let index = 0; index < contracts.length; index++) {
    const chain = contracts[index].chain

    const provider = providers[chain]
    const MasterChef = new ethers.Contract(contracts[index].address, MasterChefAbi, provider)

    const poolCount = await MasterChef.poolLength()
    let calls = []
    for (let d = 0; d < poolCount; d++) {
      calls.push({
        params: [d],
        target: MasterChef.address,
      })
    }

    const poolInfoRes = await multicall({
      chain: chain,
      calls: calls,
      abi: {
        inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        name: 'poolInfo',
        outputs: [
          { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
          { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
          { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
          { internalType: 'uint256', name: 'accStargatePerShare', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    })

    const poolInfo = poolInfoRes.filter((res) => res.success).map((res) => res.output)

    //find matching tokens
    calls = []
    for (let d = 0; d < poolInfo.length; d++) {
      calls.push({
        params: [],
        target: poolInfo[d].lpToken,
      })
    }
    const tokenDetailsRes = await multicall({
      chain: chain,
      calls: calls,
      abi: {
        inputs: [],
        name: 'token',
        outputs: [
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    })

    const tokenDetails = tokenDetailsRes.filter((res) => res.success).map((res) => res.output)

    const tokenDetailsImproved = await getERC20Details(chain, tokenDetails)
    calls = []
    for (let d = 0; d < poolInfo.length; d++) {
      calls.push({
        params: [d, ctx.address],
        target: MasterChef.address,
      })
    }
    const balancesDRes = await multicall({
      chain: chain,
      calls: calls,
      abi: {
        inputs: [
          { internalType: 'uint256', name: '', type: 'uint256' },
          { internalType: 'address', name: '', type: 'address' },
        ],
        name: 'userInfo',
        outputs: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    })
    const balancesD = balancesDRes.filter((res) => res.success).map((res) => res.output)

    for (let c = 0; c < balancesD.length; c++) {
      const balance = balancesD[c]
      if (balance.amount > 0) {
        balances.push({
          chain,
          category: 'stake',
          symbol: tokenDetailsImproved[c].symbol,
          decimals: tokenDetailsImproved[c].decimals,
          address: poolInfo[c].lpToken,
          amount: BigNumber.from(balance.amount),
          priceSubstitute: tokenDetailsImproved[c].address,
          yieldKey: poolInfo[c].lpToken,
        })
      }
    }

    calls = []
    for (let d = 0; d < poolInfo.length; d++) {
      calls.push({
        params: [d, ctx.address],
        target: MasterChef.address,
      })
    }
    const rewardAddress =
      chain === 'optimism' ? '0x4200000000000000000000000000000000000042' : await MasterChef.stargate()
    const rewardSymbol = chain === 'optimism' ? 'OP' : 'STG'

    const abi =
      chain === 'optimism'
        ? {
            inputs: [
              { internalType: 'uint256', name: '_pid', type: 'uint256' },
              { internalType: 'address', name: '_user', type: 'address' },
            ],
            name: 'pendingEmissionToken',
            outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          }
        : {
            inputs: [
              { internalType: 'uint256', name: '_pid', type: 'uint256' },
              { internalType: 'address', name: '_user', type: 'address' },
            ],
            name: 'pendingStargate',
            outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          }

    const pendingSTGRes = await multicall({
      chain: chain,
      calls: calls,
      abi: abi,
    })

    for (let i = 0; i < pendingSTGRes.length; i++) {
      if (pendingSTGRes[i].success) {
        const pendingSTGs = BigNumber.from(pendingSTGRes[i].output || 0)
        if (pendingSTGs.gt(0)) {
          const parent = balances.find(
            (bal) => bal.category === 'stake' && bal.chain === chain && bal.address === poolInfo[i].lpToken,
          )
          if (!parent) {
            continue
          }

          if (!parent.rewards) {
            parent.rewards = []
          }
          parent.rewards.push({
            chain,
            category: 'stake',
            symbol: rewardSymbol,
            decimals: 18,
            address: rewardAddress,
            amount: BigNumber.from(pendingSTGs),
            type: 'reward',
          })
        }
      }
    }
  }

  return balances
}
