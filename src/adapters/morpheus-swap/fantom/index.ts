import { getMorpheusStakersBalances } from '@adapters/morpheus-swap/fantom/stake'
import type { AdapterConfig, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import type { Token } from '@lib/token'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getPairsContracts } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const MORPH: Token = {
  chain: 'fantom',
  address: '0x0789ff5ba37f72abc4d561d00648acadc897b32d',
  decimals: 18,
  symbol: 'MORPH',
}

const stakers: Contract[] = [
  { chain: 'fantom', address: '0x47775F72E8bfa98dE4613db6cD4b5772aC4aBEC8' },
  { chain: 'fantom', address: '0x7A93C6dDEbc2089F6D5bcccF1025d6D0E31d4DA4' },
  { chain: 'fantom', address: '0x5406566EDCD5B108212Bb69382a8869D761E738E' },
  { chain: 'fantom', address: '0xdf3A3D03a92F54f8859355924f4581443B80C714' },
  { chain: 'fantom', address: '0x7373E5b59bf20345b0D452f9a294A51429ca1F9b' },
  { chain: 'fantom', address: '0x9bd3dACe24745Eb117c1F7f93AAEC5e37333c079' },
  { chain: 'fantom', address: '0x7928de9d6DB88280DBa4613864a518A98F32D342' },
  { chain: 'fantom', address: '0xaDb29fBBb9962Fe643676e2433114F0446923221' },
  { chain: 'fantom', address: '0x60131EC5BE073F1c34A9b506ce30eA7aAC7eed15' },
  { chain: 'fantom', address: '0x62CfcABA772e90F743990A8bcEDAC04AbBF7E75f' },
  { chain: 'fantom', address: '0x7E01c21789DEF6572E31Ab6c67A4182E0808428B' },
  { chain: 'fantom', address: '0x2D5F05D8e578397889f5F5C88d8e3b81D8a6f865' },
  { chain: 'fantom', address: '0x578fb737cf5F3814Ddd80Cd6a7b4FFF9504c0c39' },
  { chain: 'fantom', address: '0xb6bA5d27b00c2E62e32c0716D7c6505463cFBbf2' },
  { chain: 'fantom', address: '0xb31bF9a835584d18595d886D35157467576A76e8' },
  { chain: 'fantom', address: '0xde1592f643F9c77f186970daa43D3cAB22C0fd22' },
  { chain: 'fantom', address: '0xeF5627d8B7BC8102E0C9760F62E0c5b0b7F38AF6' },
  { chain: 'fantom', address: '0x80da05De8B759B7A9399F43C04A859cC0eaA24AC' },
  { chain: 'fantom', address: '0x983A4dA9E8baC8b8F2F04B161968906B780f3629' },
  { chain: 'fantom', address: '0x63AD93bAb2842Fefec06630b9ddC7A2351D7cb91' },
  { chain: 'fantom', address: '0x616a0030688329b4FaaFda8Cf469f1899e58cBfC' },
  { chain: 'fantom', address: '0x94005434C078e9d8cC23fF4b5D88FC9bc7c0E1A5' },
  { chain: 'fantom', address: '0xc948EaD0069adc742539c7D6e038CD132010513D' },
  { chain: 'fantom', address: '0x5D29690d7e9f4216dFE3F15C0A2db828D25e9aD5' },
  { chain: 'fantom', address: '0x3BEef19946b0595621650793d45C1cb06e9F810a' },
  { chain: 'fantom', address: '0x913473eaF564e3982E9fFb6D5c559E2adb669D61' },
  { chain: 'fantom', address: '0xA75C807d43F75806DFbDd1f302C7F388E610Be87' },
  { chain: 'fantom', address: '0x40F4F6473F39882645237f39900fc15C2E8dd56c' },
  { chain: 'fantom', address: '0xC60044503dA0C800DEE0577f294862Fc1c1Aca1B' },
  { chain: 'fantom', address: '0x04f429bBFa7032a046F24466F835284351Cef5E4' },
  { chain: 'fantom', address: '0xbC4f8A55fc3Aba02dA4E18aA66E9176EA476468D' },
  { chain: 'fantom', address: '0xF6d428f7ee882C0bdd43AA060c69f35874609B9f' },
  { chain: 'fantom', address: '0x23308c96cF9f46Fa6D7Ee714B960780551d35E16' },
  { chain: 'fantom', address: '0x11d7A542ad2E12Bd0C033C85aeF6FB891CD92690' },
  { chain: 'fantom', address: '0xc8C017674fb54F5F25f05AC0981116715465254}' },
  { chain: 'fantom', address: '0xCCA9F9E68F7E7e1BE97DA2Ff91B016c234a13c88' },
  { chain: 'fantom', address: '0xA431fDd6d23f0d7C4b4B92F4aD866a5939b53abB' },
  { chain: 'fantom', address: '0x326A7D91B6F767458599E7d93DFc850d2e083d30' },
  { chain: 'fantom', address: '0x5bCb5f2ed10aC292C9E281C5eAD4F0533666c3b6' },
]

const masterChef: Contract = {
  chain: 'fantom',
  address: '0xc7dad2e953dc7b11474151134737a007049f576e',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x9C454510848906FDDc846607E4baa27Ca999FBB6',
    offset,
    limit,
  })

  return {
    contracts: {
      pairs,
      stakers,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getMorpheusSwapBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
  rewardToken: Token,
  rewardTokenName?: string,
  lpTokenAbi?: boolean,
) {
  return Promise.all([
    getPairsBalances(ctx, pairs),
    getMasterChefPoolsBalances(ctx, pairs, masterchef, rewardToken, rewardTokenName, lpTokenAbi),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getMorpheusSwapBalances(...args, masterChef, MORPH, 'Morph'),
    stakers: getMorpheusStakersBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1631232000,
}
