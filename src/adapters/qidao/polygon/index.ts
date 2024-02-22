import { getQidaoVaultsBalances, getQidaoYieldsBalances } from '@adapters/qidao/common/balance'
import { getQidaoVaults } from '@adapters/qidao/common/vault'
import { getQidaoYieldsContracts } from '@adapters/qidao/common/yields'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultsAddresses: `0x${string}`[] = [
  '0x3fd939B017b31eaADF9ae50C7fF7Fa5c0661d47C',
  '0x61167073E31b1DAd85a3E531211c7B8F1E5cAE72',
  '0x87ee36f780ae843A78D5735867bc1c13792b7b11',
  '0x98B5F32dd9670191568b661a3e847Ed764943875',
  '0x37131aEDd3da288467B6EBe9A77C523A700E6Ca1',
  '0x701A1824e5574B0b6b1c8dA808B184a7AB7A2867',
  '0x649Aa6E6b6194250C077DF4fB37c23EE6c098513',
  '0xF086dEdf6a89e7B16145b03a6CB0C0a9979F1433',
  '0xff2c44fb819757225a176e825255a01b3b8bb051',
  '0x178f1c95c85fe7221c7a6a3d6f12b7da3253eeae',
  '0x1dcc1f864a4bd0b8f4ad33594b758b68e9fa872c',
  '0x305f113ff78255d4f8524c8f50c7300b91b10f6a',
  '0x7d36999a69f2B99BF3FB98866cBbE47aF43696C8',
  '0x506533B9C16eE2472A6BF37cc320aE45a0a24F11',
  '0x7CbF49E4214C7200AF986bc4aACF7bc79dd9C19a',
  '0xaa19d0e397c964a35e6e80262c692dbfc9c23451',
  '0x11826d20b6a16a22450978642404da95b4640123',
  '0x34fa22892256216a659d4f635354250b4d771458',
  '0x7d75F83f0aBe2Ece0b9Daf41CCeDdF38Cb66146b',
  '0x57cbf36788113237d64e46f25a88855c3dff1691',
  '0x1f0aa72b980d65518e88841ba1da075bd43fa933',
  '0x9A05b116b56304F5f4B3F1D5DA4641bFfFfae6Ab',
  '0xF1104493eC315aF2cb52f0c19605443334928D38',
  '0xb1f28350539b06d5a35d016908eef0424bd13c4b',
  '0x3bcbAC61456c9C9582132D1493A00E318EA9C122',
  '0x169d47043cc0c94c39fa327941c56cb0344dc508',
  '0xb5b31e6a13ae856bc30b3c76b16edad9f432b54f',
]

const yieldsAddresses: `0x${string}`[] = [
  '0x0470cd31c8fcc42671465880ba81d631f0b76c1d',
  '0xba6273a78a23169e01317bd0f6338547f869e8df',
  '0x7068ea5255cb05931efa8026bd04b18f3deb8b0b',
  '0xea4040b21cb68afb94889cb60834b13427cfc4eb',
  '0xe6c23289ba5a9f0ef31b8eb36241d5c800889b7b',
  '0xb3911259f435b28ec072e4ff6ff5a2c604fea0fb',
  '0x22965e296d9a0cd0e917d6d70ef2573009f8a1bb',
  '0x50279ab978f67e854f1d90850497a9cca9e80d4a',
]

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getQidaoVaults(ctx, vaultsAddresses)
  const pools = await getQidaoYieldsContracts(ctx, yieldsAddresses)

  return {
    contracts: { vaults, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getQidaoVaultsBalances(ctx, contracts.vaults || []),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: getQidaoYieldsBalances,
    }),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1619996400,
}
