import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getClaimableReward: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getClaimableReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getShare: {
    inputs: [{ internalType: 'address', name: 'stakeOwner', type: 'address' }],
    name: 'getShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getVault: {
    inputs: [],
    name: 'getVault',
    outputs: [
      {
        components: [
          { internalType: 'uint128', name: 'cap', type: 'uint128' },
          { internalType: 'uint128', name: 'balance', type: 'uint128' },
          { internalType: 'uint96', name: 'staked', type: 'uint96' },
          { internalType: 'uint96', name: 'shares', type: 'uint96' },
          { internalType: 'uint64', name: 'stakingPeriod', type: 'uint64' },
        ],
        internalType: 'struct PikaPerpV3.Vault',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPositionId: {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'productId', type: 'uint256' },
      { internalType: 'bool', name: 'isLong', type: 'bool' },
    ],
    name: 'getPositionId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
  getPositions: {
    inputs: [{ internalType: 'uint256[]', name: 'positionIds', type: 'uint256[]' }],
    name: 'getPositions',
    outputs: [
      {
        components: [
          { internalType: 'uint64', name: 'productId', type: 'uint64' },
          { internalType: 'uint64', name: 'leverage', type: 'uint64' },
          { internalType: 'uint64', name: 'price', type: 'uint64' },
          { internalType: 'uint64', name: 'oraclePrice', type: 'uint64' },
          { internalType: 'uint128', name: 'margin', type: 'uint128' },
          { internalType: 'int128', name: 'funding', type: 'int128' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'bool', name: 'isLong', type: 'bool' },
          { internalType: 'bool', name: 'isNextPrice', type: 'bool' },
          { internalType: 'uint80', name: 'timestamp', type: 'uint80' },
        ],
        internalType: 'struct PikaPerpV3.Position[]',
        name: '_positions',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getProduct: {
    inputs: [{ internalType: 'uint256', name: 'productId', type: 'uint256' }],
    name: 'getProduct',
    outputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'bool', name: '', type: 'bool' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  decimals: {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  description: {
    inputs: [],
    name: 'description',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const USDC: Token = {
  chain: 'optimism',
  address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
  decimals: 6,
  symbol: 'USDC',
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const [stakeBalancesRes, usdcRewardsRes, opRewardsRes, vaultBalancesRes] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.getShare }),
    call({ ctx, target: contract.rewarder[0], params: [ctx.address], abi: abi.getClaimableReward }),
    call({ ctx, target: contract.rewarder[1], params: [ctx.address], abi: abi.earned }),
    call({ ctx, target: contract.address, params: [], abi: abi.getVault }),
  ])

  const underlying = contract.underlyings?.[0] as Contract
  const rewards = contract.rewards as Contract[]

  const balance = BigNumber.from(stakeBalancesRes.output)
    .mul(vaultBalancesRes.output.balance)
    .div(vaultBalancesRes.output.shares)

  return {
    ...contract,
    symbol: underlying.symbol,
    decimals: 8,
    amount: balance,
    underlyings: [underlying],
    rewards: [
      { ...rewards[0], amount: BigNumber.from(usdcRewardsRes.output) },
      { ...rewards[1], amount: BigNumber.from(opRewardsRes.output) },
    ],
    category: 'stake',
  }
}

export async function getPerpetualsBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const products = await getProducts(ctx, contract)

  const [shortsPositionsRes, longPositionsRes] = await Promise.all([
    getPositions(ctx, contract, products, false),
    getPositions(ctx, contract, products, true),
  ])

  return [...shortsPositionsRes, ...longPositionsRes]
}

const getProducts = async (ctx: BalancesContext, contract: Contract): Promise<Contract[]> => {
  const products: Contract[] = []
  const PRODUCTS_COUNT = 25

  const calls: Call[] = []
  for (let idx = 1; idx < PRODUCTS_COUNT + 1; idx++) {
    calls.push({ target: contract.address, params: [idx] })
  }

  const productsAddressesRes = await multicall({ ctx, calls, abi: abi.getProduct })

  const productsInfosCalls: Call[] = []
  for (let productIdx = 0; productIdx < productsAddressesRes.length; productIdx++) {
    const productAddressRes = productsAddressesRes[productIdx]

    if (!isSuccess(productAddressRes)) {
      continue
    }

    products.push({ chain: ctx.chain, address: productAddressRes.output[0], id: productIdx + 1 })
    productsInfosCalls.push({ target: productAddressRes.output[0], params: [] })
  }

  const [productsInfosDecimalsRes, productsInfosDescriptionsRes] = await Promise.all([
    multicall({ ctx, calls: productsInfosCalls, abi: abi.decimals }),
    multicall({ ctx, calls: productsInfosCalls, abi: abi.description }),
  ])

  for (let productIdx = 0; productIdx < products.length; productIdx++) {
    const product = products[productIdx]
    const productsInfosDecimalRes = productsInfosDecimalsRes[productIdx]
    const productsInfosDescriptionRes = productsInfosDescriptionsRes[productIdx]

    if (!isSuccess(productsInfosDecimalRes) || !isSuccess(productsInfosDescriptionRes)) {
      continue
    }

    product.symbol = productsInfosDescriptionRes.output
    product.decimals = productsInfosDecimalRes.output
  }

  return products
}

interface GetPositionsParams extends Balance {
  id?: string
  positionId?: string
  side?: string
  position: BigNumber
  entryPrice: BigNumber
  margin: BigNumber
  marketPrice: BigNumber
  leverage: BigNumber
  funding: BigNumber
}

const getPositions = async (
  ctx: BalancesContext,
  contract: Contract,
  products: Contract[],
  long: boolean,
): Promise<Balance[]> => {
  const positionsIds: Contract[] = []
  const positionsDatas: GetPositionsParams[] = []

  const calls: Call[] = []
  for (const product of products) {
    calls.push({ target: contract.address, params: [ctx.address, product.id, long] })
  }

  const positionsIdsRes = await multicall({ ctx, calls, abi: abi.getPositionId })

  const positionsdatasCalls: Call[] = []
  for (let productIdx = 0; productIdx < products.length; productIdx++) {
    const product = products[productIdx]
    const positionIdRes = positionsIdsRes[productIdx]

    if (!isSuccess(positionIdRes)) {
      continue
    }

    // @ts-ignore
    positionsdatasCalls.push({ target: contract.address, params: [[positionIdRes.output]] })

    positionsIds.push({
      ...product,
      positionId: positionIdRes.output,
      side: long ? 'Long' : 'Short',
    })
  }

  const positionsDatasRes = await multicall({ ctx, calls: positionsdatasCalls, abi: abi.getPositions })

  for (let positionIdx = 0; positionIdx < positionsIds.length; positionIdx++) {
    const positionId = positionsIds[positionIdx]
    const positionDataRes = positionsDatasRes[positionIdx]

    if (!isSuccess(positionDataRes) || isZero(positionDataRes.output[0].margin) || !positionId.decimals) {
      continue
    }

    const { price: entryPrice, oraclePrice: marketPrice, margin, leverage, funding } = positionDataRes.output[0]

    const formatValue = (value: BigNumber, decimals: number): BigNumber => {
      return value.div(Math.pow(10, decimals))
    }

    positionsDatas.push({
      ...positionId,
      amount: formatValue(BigNumber.from(margin).mul(leverage), positionId.decimals),
      position: formatValue(BigNumber.from(margin).mul(leverage), positionId.decimals),
      margin: BigNumber.from(margin),
      entryPrice: BigNumber.from(entryPrice),
      marketPrice: BigNumber.from(marketPrice),
      leverage: BigNumber.from(leverage),
      funding: BigNumber.from(funding),
      underlyings: [USDC],
      rewards: undefined,
      category: 'perpetual',
    })
  }

  return positionsDatas
}
