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
  pool: {
    inputs: [],
    name: 'pool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
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

type Provider = (ctx: BalancesContext, poolBalance: Balance, poolSupplyRes: BigNumber) => Promise<Balance>

const getUnderlyingsBeefyBalances = async (ctx: BalancesContext, poolsBalances: Balance[]): Promise<Balance[]> => {
  const balancesWithUnderlyings: Balance[] = []

  const providers: Record<string, Record<string, Provider>> = {
    ethereum: {
      solidly: fmtSolidlyProvider,
      balancer: (...args) => fmtBalancerProvider(...args, '0xba12222222228d8ba445958a75a0704d566bf2c8'),
      sushi: fmtSushiProvider,
      curve: (...args) => fmtCurveProvider(...args, '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC'),
    },
    fantom: {
      spookyswap: fmtSushiProvider,
      beethovenx: (...args) => fmtBalancerProvider(...args, '0x20dd72ed959b6147912c2e529f0a0c651c33c9ce'),
    },
  }

  const getProviderFunction = (chain: string, name: string): Provider | undefined => {
    const chainProviders = providers[chain]
    if (!chainProviders) {
      return undefined
    }
    return chainProviders[name]
  }

  for (const poolBalance of poolsBalances) {
    const { underlyings, lpToken, provider } = poolBalance as Contract
    const { output: poolSuppliesRes } = await call({ ctx, target: lpToken, abi: erc20Abi.totalSupply })

    if (!underlyings || underlyings.length < 2 || !poolSuppliesRes || !provider) {
      continue
    }

    const providerFunction = getProviderFunction(ctx.chain, provider)

    if (providerFunction) {
      balancesWithUnderlyings.push(await providerFunction(ctx, poolBalance, poolSuppliesRes))
    }
  }

  return balancesWithUnderlyings
}

const fmtSolidlyProvider = async (ctx: BalancesContext, pool: Balance, supply: BigNumber): Promise<Balance> => {
  const { output: underlyingsBalancesRes } = await call({ ctx, target: (pool as Contract).lpToken, abi: abi.metadata })

  ;(pool.underlyings![0] as Balance).amount = BigNumber.from(underlyingsBalancesRes.r0).mul(pool.amount).div(supply)
  ;(pool.underlyings![1] as Balance).amount = BigNumber.from(underlyingsBalancesRes.r1).mul(pool.amount).div(supply)

  return pool
}

const fmtBalancerProvider = async (
  ctx: BalancesContext,
  pool: Balance,
  supply: BigNumber,
  registry: string,
): Promise<Balance> => {
  const { output: poolIdRes } = await call({ ctx, target: (pool as Contract).lpToken, abi: abi.getPoolId })

  const calls = pool.underlyings!.map((token) => ({ target: registry, params: [poolIdRes, token.address] }))
  const underlyingsBalancesRes = await multicall({ ctx, calls, abi: abi.getPoolTokenInfo })

  pool.underlyings!.forEach((underlying, underlyingIdx) => {
    const underlyingsBalance = underlyingsBalancesRes[underlyingIdx]

    if (isSuccess(underlyingsBalance)) {
      ;(underlying as Balance).amount = BigNumber.from(underlyingsBalance.output.cash).mul(pool.amount).div(supply)
    }
  })

  return pool
}

const fmtSushiProvider = async (ctx: BalancesContext, pool: Balance, supply: BigNumber): Promise<Balance> => {
  const calls = pool.underlyings!.map((token) => ({ target: token.address, params: [(pool as Contract).lpToken] }))
  const underlyingsBalancesRes = await multicall({ ctx, calls, abi: erc20Abi.balanceOf })

  pool.underlyings!.forEach((underlying, underlyingIdx) => {
    const underlyingsBalance = underlyingsBalancesRes[underlyingIdx]

    if (isSuccess(underlyingsBalance)) {
      ;(underlying as Balance).amount = BigNumber.from(underlyingsBalance.output).mul(pool.amount).div(supply)
    }
  })

  return pool
}

const fmtCurveProvider = async (
  ctx: BalancesContext,
  pool: Balance,
  supply: BigNumber,
  registry: string,
): Promise<Balance> => {
  const { output: poolAddress } = await call({ ctx, target: (pool as Contract).strategy, abi: abi.pool })

  const { output: underlyingsBalancesRes } = await call({
    ctx,
    target: registry,
    params: [poolAddress],
    abi: abi.get_balances,
  })

  pool.underlyings!.forEach((underlying, underlyingIdx) => {
    const underlyingsBalance = underlyingsBalancesRes[underlyingIdx]

    ;(underlying as Balance).amount = BigNumber.from(underlyingsBalance).mul(pool.amount).div(supply)
  })

  return pool
}
