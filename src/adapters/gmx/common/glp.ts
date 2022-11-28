import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi, resolveERC20Details } from '@lib/erc20'
import { BigNumber } from 'ethers'

export async function getGLPContracts(chain: Chain, contract: Contract) {
  const [stakerGLPTrackerRes, glpRes, wethRes, stakerGLPFeesRes, esGmxRes, glpVesterRes, gmxRes] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'stakedGlpTracker',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'glp',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'weth',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'feeGlpTracker',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'esGmx',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'glpVester',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'gmx',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const { stakerGLPTracker, glp, weth, stakerGLPFees, esGmx, glpVester, gmx } = await resolveERC20Details(chain, {
    stakerGLPTracker: [stakerGLPTrackerRes.output],
    glp: [glpRes.output],
    weth: [wethRes.output],
    stakerGLPFees: [stakerGLPFeesRes.output],
    esGmx: [esGmxRes.output],
    glpVester: [glpVesterRes.output],
    gmx: [gmxRes.output],
  })

  if (
    !stakerGLPTracker[0].success ||
    !glp[0].success ||
    !weth[0].success ||
    !stakerGLPFees[0].success ||
    !esGmx[0].success ||
    !glpVester[0].success ||
    !gmx[0].success
  ) {
    return
  }

  const glpStaker: Contract = {
    chain,
    decimals: stakerGLPTracker[0].output!.decimals,
    symbol: stakerGLPTracker[0].output!.symbol,
    address: stakerGLPTracker[0].output!.address,
    glpVester: glpVester[0].output,
    gmx: gmx[0].output,
    underlyings: [stakerGLPFees[0].output!, glp[0].output!],
    rewards: [esGmx[0].output!, weth[0].output!],
  }

  return glpStaker
}

export async function getGLPBalances(ctx: BaseContext, chain: Chain, contract: Contract): Promise<Balance[]> {
  if (!contract.underlyings || !contract.rewards) {
    return []
  }

  const balances: Balance[] = []

  const fGlp = contract.underlyings?.[0]
  const glp = contract.underlyings?.[1]
  const esGMX = contract.rewards?.[0]
  const native = contract.rewards?.[1]

  const [stakeGLPRes, pendingesGMXRewardsRes, pendingETHRewardsRes] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'stakedAmounts',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
      target: fGlp.address,
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

  const stakeGLP = BigNumber.from(stakeGLPRes.output)
  const pendingesGMXRewards = BigNumber.from(pendingesGMXRewardsRes.output)
  const pendingETHRewards = BigNumber.from(pendingETHRewardsRes.output)

  balances.push({
    chain,
    category: 'stake',
    address: contract.address,
    symbol: contract.symbol,
    decimals: contract.decimals,
    amount: stakeGLP,
    underlyings: [{ ...glp, amount: stakeGLP }],
    rewards: [
      { ...esGMX, amount: pendingesGMXRewards },
      { ...native, amount: pendingETHRewards },
    ],
  })

  return balances
}

export async function getGLPVesterBalances(ctx: BaseContext, chain: Chain, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const glpVester = contract.glpVester
  const gmx = contract.gmx

  const [balanceOfRes, claimableRes] = await Promise.all([
    call({
      chain,
      target: glpVester.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    call({
      chain,
      target: glpVester.address,
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
    address: glpVester.address,
    symbol: glpVester.symbol,
    decimals: glpVester.decimals,
    amount: balanceOf,
    underlyings: [{ ...gmx, amount: balanceOf }],
    rewards: [{ ...gmx, amount: claimable }],
  })

  return balances
}
