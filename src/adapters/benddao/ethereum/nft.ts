import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber, ethers } from 'ethers'
import { groupBy } from 'lodash'

const abi = {
  getBNFTAssetList: {
    inputs: [],
    name: 'getBNFTAssetList',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  bNftProxys: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'bNftProxys',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlyingAsset: {
    inputs: [],
    name: 'underlyingAsset',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenURI: {
    constant: true,
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getNftDebtData: {
    inputs: [
      { internalType: 'address', name: 'nftAsset', type: 'address' },
      { internalType: 'uint256', name: 'nftTokenId', type: 'uint256' },
    ],
    name: 'getNftDebtData',
    outputs: [
      { internalType: 'uint256', name: 'loanId', type: 'uint256' },
      { internalType: 'address', name: 'reserveAsset', type: 'address' },
      { internalType: 'uint256', name: 'totalCollateral', type: 'uint256' },
      { internalType: 'uint256', name: 'totalDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'availableBorrows', type: 'uint256' },
      { internalType: 'uint256', name: 'healthFactor', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getStakedProxies: {
    inputs: [
      { internalType: 'address', name: 'nftAsset', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'getStakedProxies',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalStaked: {
    inputs: [
      { internalType: 'contract IStakeProxy', name: 'proxy', type: 'address' },
      { internalType: 'address', name: 'staker', type: 'address' },
    ],
    name: 'totalStaked',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimable: {
    inputs: [
      { internalType: 'contract IStakeProxy', name: 'proxy', type: 'address' },
      { internalType: 'address', name: 'staker', type: 'address' },
    ],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const weth: Token = {
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbol: 'WETH',
}

const ape: Token = {
  chain: 'ethereum',
  address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
  decimals: 18,
  symbol: 'APE',
}

export async function getNftContracts(ctx: BaseContext, registry: Contract): Promise<Contract[]> {
  const nfts: Contract[] = []

  const { output: nftsAddresses } = await call({ ctx, target: registry.address, abi: abi.getBNFTAssetList })

  const nftsProxies = await multicall({
    ctx,
    calls: nftsAddresses.map((nft: string) => ({ target: registry.address, params: [nft] })),
    abi: abi.bNftProxys,
  })

  const symbolRes = await multicall({
    ctx,
    calls: nftsProxies.map((proxy) => ({ target: isSuccess(proxy) ? proxy.output : null })),
    abi: erc20Abi.symbol,
  })

  for (let nftIdx = 0; nftIdx < nftsAddresses.length; nftIdx++) {
    const nftsAddress = nftsAddresses[nftIdx]
    const nftsProxy = nftsProxies[nftIdx]
    const symbol = symbolRes[nftIdx]

    if (!isSuccess(symbol)) {
      continue
    }

    nfts.push({
      chain: ctx.chain,
      address: nftsAddress,
      proxy: nftsProxy.output,
      decimals: 18,
      symbol: symbol.output,
    })
  }

  return nfts
}

interface NFTBalance extends Balance {
  nftId?: string
  proxy?: string
}

export interface NFTBorrowBalance extends Balance {
  healthfactor: number | undefined
}

export async function getNftBalances(
  ctx: BalancesContext,
  nfts: Contract[],
  lendPool: Contract,
  apeStaker: Contract,
): Promise<Balance[]> {
  const nftContracts: Contract[] = []
  const nftContractDetails: Contract[] = []

  // Get number of nft contracts owned by the user
  const balancesOfCalls: Call[] = nfts.map((nft) => ({ target: nft.proxy, params: [ctx.address] }))
  const balancesOfResults = await multicall({ ctx, calls: balancesOfCalls, abi: erc20Abi.balanceOf })

  // Get token ids owned by the user for each nft contract
  const tokenOfOwnerCalls: Call[] = []
  balancesOfResults.forEach((res, idx) => {
    if (isSuccess(res) && !isZero(res.output)) {
      const nftContract = nfts[idx]

      for (let i = 0; i < res.output; i++) {
        nftContracts.push({ ...nftContract, amount: 1 })
        tokenOfOwnerCalls.push({ target: nftContract.proxy, params: [ctx.address, i] })
      }
    }
  })

  const nftsOwnedIdxRes = await multicall({ ctx, calls: tokenOfOwnerCalls, abi: abi.tokenOfOwnerByIndex })

  // Get token URIs for each token id
  const nftURIs = await multicall({
    ctx,
    calls: nftsOwnedIdxRes.map((res) => (isSuccess(res) ? { target: res.input.target, params: [res.output] } : null)),
    abi: abi.tokenURI,
  })

  nftContracts.forEach((balance, idx) => {
    const nftOwnedIdxRes = nftsOwnedIdxRes[idx]
    const nftURI = nftURIs[idx]

    if (isSuccess(nftOwnedIdxRes) && isSuccess(nftURI)) {
      nftContractDetails.push({
        ...balance,
        symbol: balance.symbol,
        nftId: nftOwnedIdxRes.output,
        uri: nftURI.output,
      })
    }
  })

  return getNFTLendBorrowBalances(ctx, nftContractDetails, lendPool, apeStaker)
}

const getNFTLendBorrowBalances = async (
  ctx: BalancesContext,
  nfts: Contract[],
  lendPool: Contract,
  apeStaker: Contract,
): Promise<NFTBalance[]> => {
  const nftLendBalances: Balance[] = []
  const nftBorrowBalances: NFTBorrowBalance[] = []

  const calls: Call[] = nfts.map((nft) => ({ target: lendPool.address, params: [nft.address, nft.nftId] }))
  const debtBalancesOfsRes = await multicall({ ctx, calls, abi: abi.getNftDebtData })

  nfts.forEach((nft, idx) => {
    const debtBalancesOfRes = debtBalancesOfsRes[idx]

    if (isSuccess(debtBalancesOfRes)) {
      nftLendBalances.push({
        ...nft,
        amount: BigNumber.from(debtBalancesOfRes.output.totalCollateral),
        underlyings: [weth],
        rewards: undefined,
        category: 'lend',
      })

      nftBorrowBalances.push({
        ...nft,
        amount: BigNumber.from(debtBalancesOfRes.output.totalDebt),
        underlyings: [weth],
        rewards: undefined,
        healthfactor: undefined,
        category: 'borrow',
      })

      for (const nftBorrowBalance of nftBorrowBalances) {
        if (!ethers.constants.MaxUint256.eq(debtBalancesOfRes.output.healthFactor)) {
          nftBorrowBalance.healthfactor = debtBalancesOfRes.output.healthFactor / Math.pow(10, 18)
        }
      }
    }
  })

  return apeStakingBalances(ctx, [...nftLendBalances, ...nftBorrowBalances], apeStaker)
}

const apeStakingBalances = async (
  ctx: BalancesContext,
  nftsBalances: NFTBalance[],
  apeStaker: Contract,
): Promise<Balance[]> => {
  const apeBalances: Balance[] = []
  const sortedNFTs = groupBy(nftsBalances, 'category')

  if (sortedNFTs.lend) {
    const stakedProxiesRes = await multicall({
      ctx,
      calls: sortedNFTs.lend.map((nft) =>
        nft.nftId ? { target: apeStaker.address, params: [nft.address, nft.nftId] } : null,
      ),
      abi: abi.getStakedProxies,
    })

    const calls: Call[] = stakedProxiesRes.map((proxy) => ({
      target: apeStaker.address,
      params:
        isSuccess(proxy) && proxy.output.length >= 1
          ? [proxy.output[0], ctx.address]
          : [ethers.constants.AddressZero, ctx.address],
    }))

    const [totalStakedBalancesRes, claimablesRes] = await Promise.all([
      multicall({ ctx, calls, abi: abi.totalStaked }),
      multicall({ ctx, calls, abi: abi.claimable }),
    ])

    for (let nftIdx = 0; nftIdx < sortedNFTs.lend.length; nftIdx++) {
      const totalStakedBalanceRes = totalStakedBalancesRes[nftIdx]
      const claimableRes = claimablesRes[nftIdx]

      if (!isSuccess(totalStakedBalanceRes) || !isSuccess(claimableRes)) {
        continue
      }

      apeBalances.push({
        ...apeStaker,
        symbol: ape.symbol,
        decimals: ape.decimals,
        amount: BigNumber.from(totalStakedBalanceRes.output),
        underlyings: [ape],
        rewards: [{ ...ape, amount: BigNumber.from(claimableRes.output) }],
        category: 'stake',
      })
    }
  }

  return [...nftsBalances, ...apeBalances]
}

export async function getNFTHealthFactor(nftsBalances: NFTBorrowBalance[]): Promise<number[]> {
  const healthfactor: number[] = []

  for (const nftsBalance of nftsBalances) {
    if (nftsBalance.healthfactor) {
      healthfactor.push(nftsBalance.healthfactor)
    }
  }

  return healthfactor
}
