import type { AdapterConfig } from "@lib/adapter";import { getStakedWarlordBalance, getWarlordBalance } from '@adapters/paladin-warlord/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const war: Contract = {
  chain: 'ethereum',
  address: '0xa8258deE2a677874a48F5320670A869D74f0cbC1',
  decimals: 18,
  symbol: 'WAR',
}

const stkWAR: Contract = {
  chain: 'ethereum',
  address: '0xA86c53AF3aadF20bE5d7a8136ACfdbC4B074758A',
  decimals: 18,
  symbol: 'stkWAR',
  underlyings: [war],
  rewards: [
    '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7',
    '0x616e8bfa43f920657b3497dbf40d6b1a02d4608d',
    '0xa8258dee2a677874a48f5320670a869d74f0cbc1',
    '0xa86c53af3aadf20be5d7a8136acfdbc4b074758a',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  ],
}

const warAuraLocker: Contract = {
  chain: 'ethereum',
  address: '0x7B90e043aaC79AdeA0Dbb0690E3c832757207a3B',
  token: '0xC0c293ce456fF0ED870ADd98a0828Dd4d2903DBF',
}
const warCvxLocker: Contract = {
  chain: 'ethereum',
  address: '0x700d6d24A55512c6AEC08820B49da4e4193105B3',
  token: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
}

export const getContracts = () => {
  return {
    contracts: { war, stkWAR, warAuraLocker, warCvxLocker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    war: (...args) => getWarlordBalance(...args, [warAuraLocker, warCvxLocker]),
    stkWAR: (...args) => getStakedWarlordBalance(...args, [warAuraLocker, warCvxLocker]),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1685664000,
                  }
                  