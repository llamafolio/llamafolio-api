import type { AdapterConfig } from "@lib/adapter";import { getScaleFarmBalances } from '@adapters/scale/base/balance'
import { getScaleContracts } from '@adapters/scale/base/contract'
import { getScaleLockBalances } from '@adapters/scale/base/locker'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const poolsAddresses: `0x${string}`[] = [
  '0xdc511063b00fce27b8ea6c635f4502a03ff3b6e0',
  '0xff291469d8361aa0ec1c52048587be724bf36cfe',
  '0x54ccba7e51062f60c65755160a5ba2016121bb3c',
  '0xe2f7a8dae6160f3a31eca6f0ffd5dfec8e879685',
  '0x73c2c8dfc4646e09a55cc1dbfff600b3cdf93fe8',
  '0x71b9a12b0651119c33f6288da728d828c9365aa7',
  '0x5e2c63ad5e647ce6ff61d433e1408fdef89d84e7',
  '0x5c1aebed6146cbbd13e350f119bcadc380a1febf',
  '0x4b8a814cd0db85fc829aae8c958bf73e0996e891',
  '0x9c0b958d8d8d6af3590ccdf34c29a7d302b6bd82',
  '0x0d39974402d563787af2ccf8cef61b810be621e7',
  '0x0297edfd87c1121de76a759aa71c174e49583ce6',
  '0xf0ad81e14ec57e3d31a7665d1d857d820377284e',
  '0x4333b3c77a6cb9d497bbd08b1c0805f9c00d398f',
  '0x8f11eeaa8bcb7959ca1f39e3bfdf4e36301f512a',
  '0xb0f0b5af38d28c184b4e6122ce3466ff07570def',
  '0xa04254e7c1c9a3d685fe696864493b1062233aaf',
  '0x8dae115b83858ec803d5a257a4d049f9250a37d6',
  '0x6496bc99dcb8319bef9939b45be9cb8f345ac9b1',
  // '0x481bcea81c32f3a399eabda87d0087372a37e4a2', inactive
  '0x26c4bce40426752a18d6a6d79f4a9b4597923fdc',
  // '0xe3606012071f3d59af9a2c96e9c30c613fb69e38', inactive
  '0x77c895c543ee1826ac2fd8e913ffb7c9fa7d315c',
  '0xdf8df0e62a262bd8b662ee8d6bfd82469b547d01',
  '0x05ef9148a7ddb743bcaf923983e34e64cedbf61f',
  '0xa56806766fb180431efa77de78ac42bee741a209',
  '0xe8ffeeaa85dda28018c0bd2db0302ca56fff1eff',
  '0xab74d9b152a9506d3f1883fd6ee40fa6a8d55fd4',
  '0x025abe77288e1ebac648220e1b0734ef28700a28',
  // '0x9e8894b329eec51235c316fcd6b9df3a2e33c20a', inactive
  '0xc78c118e47a9b4fc34f96c775c943fd71000bff4',
  '0x647338498b00dd6c982be80bb2a12d9344c2ff1b',
  '0xb4fd4ca08aae72d6bdcedfdaa9e8cb0ec4afc7d8',
  '0x9e3486106d879cc12f91f041d91d28d59f34b3b9',
  '0x4965348120fef479e2e67d44ce44113a835baebc',
  '0xbe81f636a20b9a4a41faf67d850c28754ef37cdb',
  '0x0447087d086f212dfd59d213935d8e052cb56295',
  '0xe256eab82a99aeffc23d12d4005a0772f0b0a7f2',
  '0x368253eea69fce6f5693a754b22d3aa76bc93463',
  '0x9a8a0bed3fed528ca990eafd7c4355a6e7c51b25',
  '0x10d1b172248fe6fc644321d86de05204cb8150f3',
  '0x7ce4f825e56a28d47891c721ef9641947c4ae6b8',
  '0xb0b5d2e0c52b5440a3311f9b52328720c49d1707',
  '0xffd2bc237be4ce82d7fbc3ffaa92874fb866e002',
  '0x8ea52ee6ffda00fff8da3224bdeb339d8d34b846',
  '0x4ee5994aafce64dc8c8c63eb9ad23a8d2d756c10',
  '0x34839eeda1c1601c04b7649d85382eda3d4853b7',
  '0xeb15e159359e898e9558d450feb11aaa07d3643d',
  '0x1a8d4284396bcd7ee0d408c5f34d29969650e2c3',
  '0xbf5093982519e31dc3260d054c3cd78d74d084ec',
  '0x7f84f3b0e1d48566926ccb170ac1795d209a1f85',
  // '0x67adeacf6ea3ba756a1dd3a6ec1b37034eaab322', inactive
  '0x0d3d4373f06fc46b6b58c2bd4a48613637a0d830',
  '0x0bd1aa659b728b9ac6cb29d37ef5a063055a8ba7',
  '0xcc9a53fdf27b75ce0df4577f14e3bc0821bdd50d',
  '0x8249ec04451db68e45b816d1ba23d2d5d8f5eee0',
  '0x608734d89449eea1519152b13b5ac880284075ce',
  '0xa83f41b26974c3fc82643a752bf859de9cedfe80',
  '0x16eb2b107cf061e0e5646194f145eacfb69db384',
  '0x804aed5e9835dc56419695f2d1cf877ae0336579',
  '0x190fc4fdb5d6aa5c625ff0e45899cda15ce3c95f',
  '0xfab311fe3e3be4bb3fed77257ee294fb22fa888b',
]

const locker: Contract = {
  chain: 'base',
  address: '0x28c9c71c776a1203000b56c0cca48bef1cd51c53',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 1000

  const [pools, { pairs, allPairsLength }] = await Promise.all([
    getScaleContracts(ctx, poolsAddresses),
    getPairsContracts({
      ctx,
      factoryAddress: '0xed8db60acc29e14bc867a497d94ca6e3ceb5ec04',
      offset,
      limit,
    }),
  ])

  return {
    contracts: {
      pools,
      pairs,
      locker,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getScaleFarmBalances,
    pairs: getPairsBalances,
    locker: getScaleLockBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1695945600,
                  }
                  