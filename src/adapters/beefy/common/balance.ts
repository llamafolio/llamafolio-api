import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'

const abi = {
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  metadata: {
    inputs: [],
    name: 'metadata',
    outputs: [
      { internalType: 'uint256', name: 'dec0', type: 'uint256' },
      { internalType: 'uint256', name: 'dec1', type: 'uint256' },
      { internalType: 'uint256', name: 'r0', type: 'uint256' },
      { internalType: 'uint256', name: 'r1', type: 'uint256' },
      { internalType: 'bool', name: 'st', type: 'bool' },
      { internalType: 'address', name: 't0', type: 'address' },
      { internalType: 'address', name: 't1', type: 'address' },
      { internalType: 'uint256', name: '_feeRatio', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolId: {
    inputs: [],
    name: 'getPoolId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolTokenInfo: {
    inputs: [
      { internalType: 'bytes32', name: 'poolId', type: 'bytes32' },
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
    ],
    name: 'getPoolTokenInfo',
    outputs: [
      { internalType: 'uint256', name: 'cash', type: 'uint256' },
      { internalType: 'uint256', name: 'managed', type: 'uint256' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
      { internalType: 'address', name: 'assetManager', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'balances',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3153,
  },
  get_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
  get_pool: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
}

const vault: Contract = {
  chain: 'ethereum',
  address: '0xba12222222228d8ba445958a75a0704d566bf2c8',
}

const registry: Contract = {
  name: 'Curve Metaregistry',
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getYieldBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfsRes, rateOfsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: abi.getPricePerFullShare }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const balanceOfRes = balanceOfsRes[poolIdx]
    const rateOfRes = rateOfsRes[poolIdx]

    if (!isSuccess(balanceOfRes) || !isSuccess(rateOfRes)) {
      continue
    }

    balances.push({
      ...pool,
      amount: BigNumber.from(balanceOfRes.output).mul(rateOfRes.output).div(utils.parseEther('1.0')),
      underlyings: pool.underlyings as Contract[],
      rewards: undefined,
      category: 'farm',
    })
  }

  return getUnderlyingsBeefyBalances(ctx, balances)
}

const getUnderlyingsBeefyBalances = async (ctx: BalancesContext, poolsBalances: Balance[]): Promise<Balance[]> => {
  const balancesWithUnderlyings: Balance[] = []

  for (const poolBalance of poolsBalances) {
    const { underlyings, lpToken, amount, provider } = poolBalance as Contract
    const { output: poolSuppliesRes } = await call({ ctx, target: lpToken, abi: erc20Abi.totalSupply })

    if (!underlyings || underlyings.length < 2 || !poolSuppliesRes || !provider) {
      continue
    }

    // mooPools using `solidly` as `provider`
    if (provider === 'solidly') {
      const { output: underlyingsBalancesRes } = await call({ ctx, target: lpToken, abi: abi.metadata })

      ;(underlyings[0] as Balance).amount = BigNumber.from(underlyingsBalancesRes.r0).mul(amount).div(poolSuppliesRes)
      ;(underlyings[1] as Balance).amount = BigNumber.from(underlyingsBalancesRes.r1).mul(amount).div(poolSuppliesRes)

      balancesWithUnderlyings.push(poolBalance)
    }

    // mooPools using `balancer` as `provider`
    if (provider === 'balancer') {
      const { output: poolIdRes } = await call({ ctx, target: lpToken, abi: abi.getPoolId })

      const calls = underlyings.map((token: any) => ({ target: vault.address, params: [poolIdRes, token.address] }))
      const underlyingsBalancesRes = await multicall({ ctx, calls, abi: abi.getPoolTokenInfo })

      underlyings.forEach((underlying, underlyingIdx) => {
        const underlyingsBalance = underlyingsBalancesRes[underlyingIdx]

        if (isSuccess(underlyingsBalance)) {
          ;(underlying as Balance).amount = BigNumber.from(underlyingsBalance.output.cash)
            .mul(amount)
            .div(poolSuppliesRes)
        }
      })

      balancesWithUnderlyings.push(poolBalance)
    }

    // mooPools using `sushi` as `provider`
    if (provider === 'sushi') {
      const calls = underlyings.map((token: any) => ({ target: token.address, params: [lpToken] }))
      const underlyingsBalancesRes = await multicall({ ctx, calls, abi: erc20Abi.balanceOf })

      underlyings.forEach((underlying, underlyingIdx) => {
        const underlyingsBalance = underlyingsBalancesRes[underlyingIdx]

        if (isSuccess(underlyingsBalance)) {
          ;(underlying as Balance).amount = BigNumber.from(underlyingsBalance.output).mul(amount).div(poolSuppliesRes)
        }
      })

      balancesWithUnderlyings.push(poolBalance)
    }

    // mooPools using `curve` as `provider`
    if (provider === 'curve') {
      const { output: poolAddress } = await call({
        ctx,
        target: registry.address,
        params: [lpToken],
        abi: abi.get_pool,
      })

      const { output: underlyingsBalancesRes } = await call({
        ctx,
        target: registry.address,
        params: [poolAddress],
        abi: abi.get_balances,
      })

      underlyings.forEach((underlying, underlyingIdx) => {
        const underlyingsBalance = underlyingsBalancesRes[underlyingIdx]

        ;(underlying as Balance).amount = BigNumber.from(underlyingsBalance).mul(amount).div(poolSuppliesRes)
      })

      balancesWithUnderlyings.push(poolBalance)
    }
  }

  return balancesWithUnderlyings
}
