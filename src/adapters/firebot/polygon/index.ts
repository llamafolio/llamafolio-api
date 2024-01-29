import type { AdapterConfig } from "@lib/adapter";import { getFireBotFarmBalances, getFireBotLPBalance, getFireBotStakeBalance } from '@adapters/firebot/polygon/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const EP: Contract = {
  chain: 'polygon',
  address: '0x60ed6acef3a96f8cdaf0c0d207bbafa66e751af2',
}

const FPT: Contract = {
  chain: 'polygon',
  address: '0xe20e046b230a5530438d32abfbcc3e61d7670234',
  underlyings: ['0x60Ed6aCEF3a96F8CDaF0c0D207BbAfA66e751af2', '0xD125443F38A69d776177c2B9c041f462936F8218'],
}

const fireFBX_FBX: Contract = {
  chain: 'polygon',
  address: '0x960d43be128585ca45365cd74a7773b9d814dfbe',
  underlyings: ['0xD125443F38A69d776177c2B9c041f462936F8218'],
}

const fireFBX_EP: Contract = {
  chain: 'polygon',
  address: '0xa2b205f8c0f0e30b3f73b7716a718c53cb8e5cc3',
  underlyings: ['0x60Ed6aCEF3a96F8CDaF0c0D207BbAfA66e751af2'],
}

export const getContracts = () => {
  return {
    contracts: { EP, FPT, fireFBXs: [fireFBX_FBX, fireFBX_EP] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    EP: getFireBotStakeBalance,
    FPT: getFireBotLPBalance,
    fireFBXs: getFireBotFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1685059200,
                  }
                  