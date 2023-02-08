import { BaseContext, Contract } from '@lib/adapter'
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
}

export async function getGMXContracts(ctx: BaseContext, gmxRouter: Contract, vault: Contract) {
  const [
    stakedGmxTrackerRes,
    stakedGlpTrackerRes,
    gmxRes,
    glpRes,
    wethRes,
    stakerGmxFeesRes,
    esGmxRes,
    gmxVesterRes,
    glpVesterRes,
    vaultTokens,
  ] = await Promise.all([
    call({ ctx, target: gmxRouter.address, params: [], abi: abi.stakedGmxTracker }),
    call({ ctx, target: gmxRouter.address, params: [], abi: abi.stakedGlpTracker }),
    call({ ctx, target: gmxRouter.address, params: [], abi: abi.gmx }),
    call({ ctx, target: gmxRouter.address, params: [], abi: abi.glp }),
    call({ ctx, target: gmxRouter.address, params: [], abi: abi.weth }),
    call({ ctx, target: gmxRouter.address, params: [], abi: abi.feeGmxTracker }),
    call({ ctx, target: gmxRouter.address, params: [], abi: abi.esGmx }),
    call({ ctx, target: gmxRouter.address, params: [], abi: abi.gmxVester }),
    call({ ctx, target: gmxRouter.address, params: [], abi: abi.glpVester }),
    getVaultTokens(ctx, vault),
  ])

  // GMX
  const gmxVester: Contract = {
    chain: ctx.chain,
    address: gmxVesterRes.output,
    underlyings: [esGmxRes.output],
    rewards: [gmxRes.output],
  }

  const gmxStaker: Contract = {
    chain: ctx.chain,
    address: stakedGmxTrackerRes.output,
    underlyings: [stakerGmxFeesRes.output, gmxRes.output],
    rewards: [esGmxRes.output, wethRes.output],
  }

  // GLP
  const glpStaker: Contract = {
    chain: ctx.chain,
    address: stakedGlpTrackerRes.output,
    fGlp: stakerGmxFeesRes.output,
    glp: glpRes.output,
    underlyings: vaultTokens,
    rewards: [esGmxRes.output, wethRes.output],
  }

  const glpVester: Contract = {
    chain: ctx.chain,
    address: glpVesterRes.output,
    underlyings: [esGmxRes.output],
    rewards: [gmxRes.output],
  }

  return { gmxVester, gmxStaker, glpStaker, glpVester }
}
