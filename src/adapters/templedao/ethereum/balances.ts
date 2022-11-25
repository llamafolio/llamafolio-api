import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { BigNumber } from 'ethers'

const TEMPLE: Contract = {
  name: 'Temple',
  displayName: 'Temple Token',
  chain: 'ethereum',
  address: '0x470ebf5f030ed85fc1ed4c2d36b9dd02e77cf1b7',
  decimals: 18,
  symbol: 'TEMPLE ',
}

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contract: Contract,
  templeStaking: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const balanceOf = balanceOfRes.output

  const formattedBalanceRes = await call({
    chain,
    target: templeStaking.address,
    params: [balanceOf],
    abi: {
      inputs: [{ internalType: 'uint256', name: 'amountOgTemple', type: 'uint256' }],
      name: 'balance',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const formattedBalance = BigNumber.from(formattedBalanceRes.output)

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: contract.decimals,
    amount: formattedBalance,
    underlyings: [{ ...TEMPLE, amount: formattedBalance }],
    category: 'stake',
  }

  balances.push(balance)

  return balances
}

export async function getLockedBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]): Promise<Balance[]> {
  const calls = contracts.map((contract) => ({
    target: contract.address,
    params: [],
  }))

  const [balancesLockedRes, periodStartTimestampRes, periodDurationRes] = await Promise.all([
    multicall({
      chain,
      calls: contracts.map((contract) => ({
        target: contract.address,
        params: [ctx.address],
      })),
      abi: abi.balanceOf,
    }),

    multicall({
      chain,
      calls,
      abi: {
        inputs: [],
        name: 'firstPeriodStartTimestamp',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    multicall({
      chain,
      calls,
      abi: {
        inputs: [],
        name: 'periodDuration',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  return contracts
    .map((contract, i) => {
      if (!TEMPLE || !balancesLockedRes[i].success) {
        return
      }

      const amountLocked = BigNumber.from(balancesLockedRes[i].output)

      const balance: Balance = {
        chain,
        decimals: contract.decimals,
        symbol: contract.symbol,
        address: contract.address,
        amount: amountLocked,
        underlyings: [{ ...TEMPLE, amount: amountLocked }],
        category: 'lock',
      }

      // end lock
      if (periodStartTimestampRes[i].success && periodDurationRes[i].success) {
        balance.lock = {
          end: parseInt(periodStartTimestampRes[i].output) + parseInt(periodDurationRes[i].output),
        }
      }

      return balance
    })
    .filter(isNotNullish)
}
