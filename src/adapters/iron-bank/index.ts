import { Adapter, GetBalancesHandler } from '@lib/adapter'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/lending'

const getContracts = async () => {
  const marketsETH = await getMarketsContracts('ethereum', {
    // Iron-Bank Unitroller on ETH chain
    comptrollerAddress: '0xAB1c342C7bf5Ec5F02ADEA1c2270670bCa144CbB',
  })

  const marketsAVAX = await getMarketsContracts('avax', {
    // Iron-Bank Unitroller on AVAX chain
    comptrollerAddress: '0x2eE80614Ccbc5e28654324a66A396458Fa5cD7Cc',
  })

  const marketsOPT = await getMarketsContracts('optimism', {
    // Iron-Bank Unitroller on Optimism chain
    comptrollerAddress: '0xE0B57FEEd45e7D908f2d0DaCd26F113Cf26715BF',
  })

  const marketsFTM = await getMarketsContracts('fantom', {
    // Iron-Bank Unitroller on Fantom chain
    comptrollerAddress: '0x4250A6D3BD57455d7C6821eECb6206F507576cD2',
  })

  return {
    contracts: { marketsETH, marketsAVAX, marketsOPT, marketsFTM },
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { marketsETH, marketsAVAX, marketsOPT, marketsFTM },
) => {
  const [balancesETH, balancesAVAX, balancesOPT, balancesFTM] = await Promise.all([
    getMarketsBalances(ctx, 'ethereum', marketsETH || []),
    getMarketsBalances(ctx, 'avax', marketsAVAX || []),
    getMarketsBalances(ctx, 'optimism', marketsOPT || []),
    getMarketsBalances(ctx, 'fantom', marketsFTM || []),
  ])

  const balances = [...balancesETH, ...balancesAVAX, ...balancesOPT, ...balancesFTM]

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'iron-bank',
  getContracts,
  getBalances,
}

export default adapter
