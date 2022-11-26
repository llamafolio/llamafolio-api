import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi as erc20Abi, resolveERC20Details } from '@lib/erc20'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  esGmx: {
    inputs: [],
    name: 'esGmx',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  feeGmxTracker: {
    inputs: [],
    name: 'feeGmxTracker',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  gmx: {
    inputs: [],
    name: 'gmx',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  gmxVester: {
    inputs: [],
    name: 'gmxVester',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakedGmxTracker: {
    inputs: [],
    name: 'stakedGmxTracker',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  weth: {
    inputs: [],
    name: 'weth',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getGMXContract(chain: Chain, contract: Contract) {
  const [stakerGmxTrackerRes, gmxRes, wethRes, stakerGmxFeesRes, esGmxRes, gmxVesterRes] = await Promise.all([
    call({ chain, target: contract.address, params: [], abi: abi.stakedGmxTracker }),
    call({ chain, target: contract.address, params: [], abi: abi.gmx }),
    call({ chain, target: contract.address, params: [], abi: abi.weth }),
    call({ chain, target: contract.address, params: [], abi: abi.feeGmxTracker }),
    call({ chain, target: contract.address, params: [], abi: abi.esGmx }),
    call({ chain, target: contract.address, params: [], abi: abi.gmxVester }),
  ])

  const { stakerGmxTrackerToken, gmxToken, wethToken, stakerGmxFeesToken, esGmxToken, gmxVesterToken } =
    await resolveERC20Details(chain, {
      stakerGmxTrackerToken: [stakerGmxTrackerRes.output],
      gmxToken: [gmxRes.output],
      wethToken: [wethRes.output],
      stakerGmxFeesToken: [stakerGmxFeesRes.output],
      esGmxToken: [esGmxRes.output],
      gmxVesterToken: [gmxVesterRes.output],
    })

  const stakerGmxTrackerTokenRes = stakerGmxTrackerToken[0]
  const gmxTokenRes = gmxToken[0]
  const wethTokenRes = wethToken[0]
  const stakerGmxFeesTokenRes = stakerGmxFeesToken[0]
  const esGmxTokenRes = esGmxToken[0]
  const gmxVesterTokenRes = gmxVesterToken[0]

  if (
    !isSuccess(stakerGmxTrackerTokenRes) ||
    !isSuccess(gmxTokenRes) ||
    !isSuccess(wethTokenRes) ||
    !isSuccess(stakerGmxFeesTokenRes) ||
    !isSuccess(esGmxTokenRes) ||
    !isSuccess(gmxVesterTokenRes)
  ) {
    return
  }

  const gmxStaker: Contract = {
    chain,
    decimals: stakerGmxTrackerTokenRes.output.decimals,
    symbol: stakerGmxTrackerTokenRes.output.symbol,
    address: stakerGmxTrackerTokenRes.output.address,
    gmxVester: gmxVesterTokenRes.output,
    underlyings: [stakerGmxFeesTokenRes.output, gmxTokenRes.output],
    rewards: [esGmxTokenRes.output, wethTokenRes.output],
  }

  return gmxStaker
}

export async function getGMXBalances(ctx: BaseContext, chain: Chain, contract: Contract): Promise<Balance[]> {
  if (!contract.underlyings || !contract.rewards) {
    return []
  }

  const balances: Balance[] = []

  const sbfGMX = contract.underlyings?.[0]
  const gmx = contract.underlyings?.[1]
  const esGMX = contract.rewards?.[0]
  const native = contract.rewards?.[1]

  const [stakeGMXRes, stakeEsGMXRes, pendingesGMXRewardsRes, pendingETHRewardsRes] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [ctx.address, gmx.address],
      abi: {
        inputs: [
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
        ],
        name: 'depositBalances',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [ctx.address, esGMX.address],
      abi: {
        inputs: [
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
        ],
        name: 'depositBalances',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
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
        inputs: [
          {
            internalType: 'address',
            name: '_account',
            type: 'address',
          },
        ],
        name: 'claimable',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: sbfGMX.address,
      params: [ctx.address],
      abi: {
        inputs: [
          {
            internalType: 'address',
            name: '_account',
            type: 'address',
          },
        ],
        name: 'claimable',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const stakeGMX = BigNumber.from(stakeGMXRes.output)
  const stakeEsGMX = BigNumber.from(stakeEsGMXRes.output)
  const pendingesGMXRewards = BigNumber.from(pendingesGMXRewardsRes.output)
  const pendingETHRewards = BigNumber.from(pendingETHRewardsRes.output)

  const gmxBalance: Balance = {
    chain,
    category: 'stake',
    address: contract.address,
    symbol: contract.symbol,
    decimals: contract.decimals,
    amount: stakeGMX,
    underlyings: [{ ...gmx, amount: stakeGMX }],
    rewards: [
      { ...esGMX, amount: pendingesGMXRewards },
      { ...native, amount: pendingETHRewards },
    ],
  }

  const esGmxBalance: Balance = {
    chain,
    category: 'stake',
    address: esGMX.address,
    symbol: esGMX.symbol,
    decimals: esGMX.decimals,
    amount: stakeEsGMX,
    underlyings: [{ ...gmx, amount: stakeEsGMX }],
  }

  balances.push(gmxBalance, esGmxBalance)

  return balances
}

export async function getGMXVesterBalances(ctx: BaseContext, chain: Chain, contract: Contract) {
  if (!contract.underlyings || !contract.rewards) {
    return []
  }

  const balances: Balance[] = []

  const gmxVester = contract.gmxVester
  const gmx = contract.underlyings[1]

  const [balanceOfRes, claimableRes] = await Promise.all([
    call({
      chain,
      target: gmxVester.address,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),

    call({
      chain,
      target: gmxVester.address,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
        name: 'claimable',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const balanceOf = BigNumber.from(balanceOfRes.output)
  const claimable = BigNumber.from(claimableRes.output)

  balances.push({
    chain,
    category: 'vest',
    address: gmxVester.address,
    symbol: gmxVester.symbol,
    decimals: gmxVester.decimals,
    amount: balanceOf,
    underlyings: [{ ...gmx, amount: balanceOf }],
    rewards: [{ ...gmx, amount: claimable }],
  })

  return balances
}
