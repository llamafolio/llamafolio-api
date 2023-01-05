import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { abi as erc20Abi, getERC20BalanceOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { ETH_ADDR, Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber, ethers } from 'ethers'

const curveMetaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

const abi = {
  getPoolFromLPToken: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 2443,
  },
  getUnderlyingsCoins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
  },
  underlyingsBalances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[4]' }],
  },
}

export async function getPoolsFromLpTokens(ctx: BaseContext, lpTokens: string[]) {
  const contracts: Contract[] = []

  const getPoolFromLPTokensRes = await multicall<string, string[], string>({
    ctx,
    calls: lpTokens.map((lpToken) => ({
      target: curveMetaRegistry.address,
      params: [lpToken],
    })),
    abi: abi.getPoolFromLPToken,
  })

  // underlyings
  const getUnderlyingsRes = await multicall<string, [string], string[]>({
    ctx,
    calls: getPoolFromLPTokensRes.map((res) =>
      res.success
        ? {
            target: curveMetaRegistry.address,
            params: [res.output],
          }
        : null,
    ),
    abi: abi.getUnderlyingsCoins,
  })

  for (let poolIdx = 0; poolIdx < lpTokens.length; poolIdx++) {
    const poolRes = getPoolFromLPTokensRes[poolIdx]
    const underlyingsRes = getUnderlyingsRes[poolIdx]
    if (!isSuccess(poolRes) || !isSuccess(underlyingsRes)) {
      continue
    }

    const contract: Contract = {
      chain: ctx.chain,
      address: poolRes.output,
      lpToken: lpTokens[poolIdx],
      underlyings: underlyingsRes.output
        .map((address) => address.toLowerCase())
        // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
        .filter((address) => address !== ethers.constants.AddressZero)
        // replace ETH alias
        .map((address) => (address === ETH_ADDR ? ethers.constants.AddressZero : address)),
    }

    contracts.push(contract)
  }

  return contracts
}

export interface GetPoolsBalancesParams {
  getBalanceAddress: (contract: Contract) => string
  getLpTokenAddress: (contract: Contract) => string
  getPoolAddress: (contract: Contract) => string
}

export async function getPoolsBalances(ctx: BalancesContext, pools: Contract[], params: GetPoolsBalancesParams) {
  const { getBalanceAddress, getLpTokenAddress, getPoolAddress } = params
  const balances: Balance[] = []

  const poolsBalances = (
    await getERC20BalanceOf(ctx, pools as Token[], { getContractAddress: getBalanceAddress })
  ).filter((balance) => balance.amount.gt(0))

  const [totalSuppliesRes, underlyingsBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: poolsBalances.map((pool) => ({
        target: getLpTokenAddress(pool),
        params: [],
      })),
      abi: erc20Abi.totalSupply,
    }),

    multicall<string, [string], string[]>({
      ctx,
      target: curveMetaRegistry.address,
      calls: poolsBalances.map((pool) => ({
        target: curveMetaRegistry.address,
        params: [getPoolAddress(pool)],
      })),
      abi: abi.underlyingsBalances,
    }),
  ])

  for (let poolIdx = 0; poolIdx < poolsBalances.length; poolIdx++) {
    const poolBalance = poolsBalances[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const underlyings = poolBalance.underlyings
    const underlyingBalancesRes = underlyingsBalancesRes[poolIdx]
    if (!underlyings || !isSuccess(totalSupplyRes) || !isSuccess(underlyingBalancesRes)) {
      continue
    }

    const balance: Balance = {
      ...poolBalance,
      underlyings: [],
    }

    const totalSupply = BigNumber.from(totalSupplyRes.output)

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlyingBalance = BigNumber.from(underlyingBalancesRes.output[underlyingIdx] || '0')

      const underlyingAmount = underlyingBalance.mul(poolBalance.amount).div(totalSupply)

      balance.underlyings!.push({ ...underlyings[underlyingIdx], amount: underlyingAmount })
    }

    balances.push(balance)
  }

  return balances
}
