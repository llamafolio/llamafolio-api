import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

import { getVaultTokens } from './vault'

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
  glp: {
    inputs: [],
    name: 'glp',
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
  glpVester: {
    inputs: [],
    name: 'glpVester',
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
  stakedGlpTracker: {
    inputs: [],
    name: 'stakedGlpTracker',
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
  feeGlpTracker: {
    inputs: [],
    name: 'feeGlpTracker',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGMXContracts(ctx: BaseContext, gmxRouter: Contract, vault: Contract) {
  const [
    stakedGmxTrackerRes,
    stakedGlpTrackerRes,
    gmxRes,
    glpRes,
    wethRes,
    stakerGmxFeesRes,
    stakerGlpFeesRes,
    esGmxRes,
    gmxVesterRes,
    glpVesterRes,
    vaultTokens,
  ] = await Promise.all([
    call({ ctx, target: gmxRouter.address, abi: abi.stakedGmxTracker }),
    call({ ctx, target: gmxRouter.address, abi: abi.stakedGlpTracker }),
    call({ ctx, target: gmxRouter.address, abi: abi.gmx }),
    call({ ctx, target: gmxRouter.address, abi: abi.glp }),
    call({ ctx, target: gmxRouter.address, abi: abi.weth }),
    call({ ctx, target: gmxRouter.address, abi: abi.feeGmxTracker }),
    call({ ctx, target: gmxRouter.address, abi: abi.feeGlpTracker }),
    call({ ctx, target: gmxRouter.address, abi: abi.esGmx }),
    call({ ctx, target: gmxRouter.address, abi: abi.gmxVester }),
    call({ ctx, target: gmxRouter.address, abi: abi.glpVester }),
    getVaultTokens(ctx, vault),
  ])

  // GMX
  const gmxVester: Contract = {
    chain: ctx.chain,
    address: gmxVesterRes,
    underlyings: [esGmxRes],
    rewards: [gmxRes],
  }

  const gmxStaker: Contract = {
    chain: ctx.chain,
    address: stakedGmxTrackerRes,
    underlyings: [stakerGmxFeesRes, gmxRes],
    rewards: [esGmxRes, wethRes],
  }

  // GLP
  const glpStaker: Contract = {
    chain: ctx.chain,
    address: stakedGlpTrackerRes,
    sfGlp: stakerGlpFeesRes,
    fGlp: stakerGmxFeesRes,
    glp: glpRes,
    underlyings: vaultTokens,
    rewards: [esGmxRes, wethRes],
  }

  const glpVester: Contract = {
    chain: ctx.chain,
    address: glpVesterRes,
    underlyings: [esGmxRes],
    rewards: [gmxRes],
  }

  return { gmxVester, gmxStaker, glpStaker, glpVester }
}
