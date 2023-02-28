import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'

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
}

interface NFTBalances extends Balance {
  uri: string
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

export async function getNftBalances(ctx: BalancesContext, nfts: Contract[]): Promise<Balance[]> {
  const balances: Contract[] = []
  const nftBalances: NFTBalances[] = []

  const balancesOfsRes = await multicall({
    ctx,
    calls: nfts.map((nft) => ({ target: nft.proxy, params: [ctx.address] })),
    abi: erc20Abi.balanceOf,
  })

  const calls: Call[] = []
  for (let nftIdx = 0; nftIdx < nfts.length; nftIdx++) {
    const nft = nfts[nftIdx]
    const balancesOfRes = balancesOfsRes[nftIdx]

    if (!isSuccess(balancesOfRes) || isZero(balancesOfRes.output)) {
      continue
    }

    for (let index = 0; index < balancesOfRes.output; index++) {
      balances.push({ ...nft, amount: 1, underlyings: undefined, rewards: undefined, id: index })
      calls.push({ target: nft.proxy, params: [ctx.address, index] })
    }
  }

  const nftsOwnedIdxRes = await multicall({ ctx, calls, abi: abi.tokenOfOwnerByIndex })

  const nftURIs = await multicall({
    ctx,
    // @ts-ignore
    calls: nftsOwnedIdxRes.map((res) => ({ target: res.input.target, params: isSuccess(res) ? [res.output] : null })),
    abi: abi.tokenURI,
  })

  for (let index = 0; index < balances.length; index++) {
    const balance = balances[index]
    const nftsOwnedIdx = nftsOwnedIdxRes[index]
    const nftURI = nftURIs[index]

    if (!isSuccess(nftsOwnedIdx) || !isSuccess(nftURI)) {
      continue
    }

    nftBalances.push({
      ...balance,
      symbol: `${balance.symbol} - #${nftsOwnedIdx.output}`,
      amount: BigNumber.from(balance.amount).mul(utils.parseEther('1.0')),
      underlyings: undefined,
      uri: nftURI.output,
      rewards: undefined,
      category: 'stake',
    })
  }

  return nftBalances
}
