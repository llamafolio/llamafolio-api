import { call } from '@defillama/sdk/build/abi'
import { Chain } from '@lib/chains'
import { BaseContext, Contract, Balance } from '@lib/adapter'
import { range } from '@lib/array'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

interface BalanceWithExtraProps extends Balance {
  collateralFactor: string
}

export async function getAssetsContracts(chain: Chain, contract?: Contract) {
  const contracts: Contract[] = []

  if (!contract) {
    console.log('Missing or incorrect contract')

    return []
  }

  try {
    const numberOfAssets = await call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'numAssets',
        outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function',
      },
    })

    const getAssetsInfosRes = await multicall({
      chain,
      calls: range(0, numberOfAssets.output).map((i) => ({
        target: contract.address,
        params: [i],
      })),
      abi: {
        inputs: [{ internalType: 'uint8', name: 'i', type: 'uint8' }],
        name: 'getAssetInfo',
        outputs: [
          {
            components: [
              { internalType: 'uint8', name: 'offset', type: 'uint8' },
              { internalType: 'address', name: 'asset', type: 'address' },
              { internalType: 'address', name: 'priceFeed', type: 'address' },
              { internalType: 'uint64', name: 'scale', type: 'uint64' },
              {
                internalType: 'uint64',
                name: 'borrowCollateralFactor',
                type: 'uint64',
              },
              {
                internalType: 'uint64',
                name: 'liquidateCollateralFactor',
                type: 'uint64',
              },
              {
                internalType: 'uint64',
                name: 'liquidationFactor',
                type: 'uint64',
              },
              { internalType: 'uint128', name: 'supplyCap', type: 'uint128' },
            ],
            internalType: 'struct CometCore.AssetInfo',
            name: '',
            type: 'tuple',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    })

    const getAssetsInfos = getAssetsInfosRes.filter((res) => res.success).map((res) => res.output[1])

    const borrowCollateralFactor = getAssetsInfosRes
      .filter((res) => res.success)
      .map((res) => BigNumber.from(res.output.borrowCollateralFactor))

    const assetsInfos = await getERC20Details(chain, getAssetsInfos)

    for (let i = 0; i < assetsInfos.length; i++) {
      const assetsInfo = assetsInfos[i]

      const asset: Contract = {
        ...assetsInfo,
        collateralFactor: borrowCollateralFactor[i],
      }

      contracts.push(asset)
    }

    return contracts
  } catch (error) {
    console.log('Failed to get assets')

    return []
  }
}

export async function getLendBorrowBalances(ctx: BaseContext, chain: Chain, contract: Contract, assets: Contract[]) {
  const balances: Balance[] = []
  const usdc = contract.underlyings?.[0]

  if (!contract || !usdc || !assets) {
    console.log('Missing or incorrect contract/assets')

    return []
  }

  try {
    const [userCollateralBalancesRes, userBorrowBalancesRes] = await Promise.all([
      multicall({
        chain,
        calls: assets.map((asset) => ({
          target: contract.address,
          params: [ctx.address, asset.address],
        })),
        abi: {
          inputs: [
            { internalType: 'address', name: '', type: 'address' },
            { internalType: 'address', name: '', type: 'address' },
          ],
          name: 'userCollateral',
          outputs: [
            { internalType: 'uint128', name: 'balance', type: 'uint128' },
            { internalType: 'uint128', name: '_reserved', type: 'uint128' },
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
          inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
          name: 'borrowBalanceOf',
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      }),
    ])

    const userCollateralBalances = userCollateralBalancesRes
      .filter((res) => res.success)
      .map((res) => BigNumber.from(res.output.balance))

    const userBorrowBalances = BigNumber.from(userBorrowBalancesRes.output)

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i]
      const userCollateralBalance = userCollateralBalances[i]

      const supply: BalanceWithExtraProps = {
        chain,
        decimals: asset.decimals,
        symbol: asset.symbol,
        address: asset.address,
        amount: userCollateralBalance,
        collateralFactor: asset.collateralFactor,
        category: 'lend',
      }

      balances.push(supply)
    }

    const borrow: Balance = {
      chain,
      decimals: usdc.decimals,
      symbol: usdc.symbol,
      address: usdc.address,
      amount: userBorrowBalances,
      category: 'borrow',
    }

    balances.push(borrow)

    return balances
  } catch (error) {
    console.log('Failed to get lend/borrow balance')

    return []
  }
}
