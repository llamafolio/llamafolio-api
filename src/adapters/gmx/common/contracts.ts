import { Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'

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

export async function getGMXContracts(chain: Chain, gmxRouter: Contract) {
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
  ] = await Promise.all([
    call({ chain, target: gmxRouter.address, params: [], abi: abi.stakedGmxTracker }),
    call({ chain, target: gmxRouter.address, params: [], abi: abi.stakedGlpTracker }),
    call({ chain, target: gmxRouter.address, params: [], abi: abi.gmx }),
    call({ chain, target: gmxRouter.address, params: [], abi: abi.glp }),
    call({ chain, target: gmxRouter.address, params: [], abi: abi.weth }),
    call({ chain, target: gmxRouter.address, params: [], abi: abi.feeGmxTracker }),
    call({ chain, target: gmxRouter.address, params: [], abi: abi.esGmx }),
    call({ chain, target: gmxRouter.address, params: [], abi: abi.gmxVester }),
    call({ chain, target: gmxRouter.address, params: [], abi: abi.glpVester }),
  ])

  // GMX
  const gmxVester: Contract = {
    chain,
    address: gmxVesterRes.output,
    underlyings: [esGmxRes.output],
    rewards: [gmxRes.output],
  }

  const gmxStaker: Contract = {
    chain,
    address: stakedGmxTrackerRes.output,
    underlyings: [stakerGmxFeesRes.output, gmxRes.output],
    rewards: [esGmxRes.output, wethRes.output],
  }

  // GLP
  const glpStaker: Contract = {
    chain,
    address: stakedGlpTrackerRes.output,
    fGlp: stakerGmxFeesRes.output,
    underlyings: [glpRes.output],
    rewards: [esGmxRes.output, wethRes.output],
  }

  const glpVester: Contract = {
    chain,
    address: glpVesterRes.output,
    underlyings: [esGmxRes.output],
    rewards: [gmxRes.output],
  }

  return { gmxVester, gmxStaker, glpStaker, glpVester }
}
