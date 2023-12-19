import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  balanceOf: {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface TokenByIds {
  [key: string]: string
}

const tokenByIds: TokenByIds = {
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1':
    '68598205499637732940393479723998335974150219832588297998851264911405221787060', // WETH
  '0x5979d7b546e38e414f7e9822514be443a4800529':
    '32724548576318001670556591985246081159609078531619344196326067264614400219953', // wstETH
  '0x9ed7e4b1bff939ad473da5e7a218c771d1569456':
    '5159943940022542831786931686149875617997271331367331992406615704720154440846', // REUNI
  '0x912ce59144191c1204e64559fe8253a0e49e6548':
    '15289338637746492243507508172075284374606272498339755847074708978610947567249', // ARB
  '0x539bde0d7dbd336b79148aa742883198bbf60342':
    '32579059836797942647105779116600635779018130912142677201118367918170517694627', // MAGIC
  '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1':
    '6035551758411270646474335658514335349674717801108451006051182668568832578004', // DAI
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8':
    '67271412857715135027962267816154255654502207397591045005455032686546771069218', // USDC
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9':
    '94403927151183364591870487470764120937216882736599114675039888021977646377740', // USDT
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f':
    '59141285909977308443388272935459943129132961051990188111045082080537753428204', // WBTC
  '0x6694340fc020c5e6b96567843da2df01b2ce1eb6':
    '25188701624367602286863586734041950338476366818463077389075015866458016215753', // STG
}

function getAddressFromId(id: string, tokenMap: TokenByIds): string | undefined {
  return Object.keys(tokenMap).find((key) => tokenMap[key] === id)
}

export async function getShellBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const underlyingsIds = staker.underlyings!.map((underlying: any) => tokenByIds[underlying.address.toLowerCase()])
  const calls = underlyingsIds.map((id) => ({ target: staker.address, params: [ctx.address, id] }) as any)

  const userBalances = await multicall({ ctx, calls, abi: abi.balanceOf })

  return mapSuccessFilter(userBalances, (res) => {
    const id = res.input.params[1]
    const address = getAddressFromId(id, tokenByIds)

    if (!address) return null

    const underlying = staker.underlyings!.find(
      (underlying: any) => underlying.address.toLowerCase() === address.toLowerCase(),
    ) as Contract

    return underlying
      ? {
          ...underlying,
          amount: res.output,
          decimals: 18,
          underlyings: undefined,
          rewards: undefined,
          category: 'stake' as Category,
        }
      : null
  }).filter(isNotNullish)
}
