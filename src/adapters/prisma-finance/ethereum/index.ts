import { getPrismaFarmBalance, getPrismaLendBalances } from '@adapters/prisma-finance/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmer: Contract = {
  chain: 'ethereum',
  address: '0xed8b26d99834540c5013701bb3715fafd39993ba',
  token: '0x4591DBfF62656E7859Afe5e45f6f47D3669fBB28',
}

const vaults: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    troves: '0xBf6883a03FD2FCfa1B9fc588ad6193b3C3178F8F',
  },
  {
    chain: 'ethereum',
    address: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    troves: '0xe0e255FD5281bEc3bB8fa1569a20097D9064E445',
  },
  {
    chain: 'ethereum',
    address: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
    troves: '0x63Cc74334F4b1119276667cf0079AC0c8a96CFb2',
  },
  {
    chain: 'ethereum',
    address: '0xac3E018457B222d93114458476f3E3416Abbe38F',
    troves: '0xf69282a7e7ba5428f92F610E7AFa1C0ceDC4E483',
  },
]

export const getContracts = () => {
  return {
    contracts: { vaults, farmer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getPrismaLendBalances,
    farmer: getPrismaFarmBalance,
  })

  return {
    groups: [{ balances }],
  }
}
