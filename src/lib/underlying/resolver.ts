import type { Balance, BalancesContext } from '@lib/adapter'
import { getUnderlyingsBalancesFromBalancer } from '@lib/underlying/provider/balancer'
import { getUnderlyingsBalancesFromCurve } from '@lib/underlying/provider/curve'
import { getDefaultSingleUnderlyingsBalances } from '@lib/underlying/provider/default'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

interface BasicResolverArgs {
  ctx: BalancesContext
  balances: any[] // test
}

const getUnderlyingsBalances: { [key: string]: (args: any) => Promise<Balance[]> } = {
  single: ({ ctx, balances, params }: any) => getDefaultSingleUnderlyingsBalances(ctx, balances, params),
  univ2: ({ ctx, balances, params }: any) => getUnderlyingBalances(ctx, balances, params),
  balancer: ({ ctx, balances, vault, params }: any) => getUnderlyingsBalancesFromBalancer(ctx, balances, vault, params),
  curve: ({ ctx, balances, registry }: any) => getUnderlyingsBalancesFromCurve(ctx, balances, registry),
}

// export async function resolveUnderlyingsBalances<T extends BasicResolverArgs>(
//   provider: string,
//   resolverArgs: T,
// ): Promise<Balance[]> {
//   return getUnderlyingsBalances[provider](resolverArgs)
// }

// export async function resolveUnderlyingsBalances<T extends BasicResolverArgs>(resolverArgs: T): Promise<Balance[]> {
//   const { balances } = resolverArgs

//   const allBalances: Balance[] = []

//   for (const balanceItem of balances) {
//     const underlyingsArray = balanceItem.underlyings

//     if (underlyingsArray && underlyingsArray.length) {
//       for (const underlyings of underlyingsArray) {
//         const provider = underlyings.adapterId

//         if (provider && getUnderlyingsBalances[provider]) {
//           const balancesForProvider = await getUnderlyingsBalances[provider](resolverArgs)
//           allBalances.push(...balancesForProvider)
//         }
//       }
//     }
//   }

//   return allBalances
// }

// async function resolveUnderlyingRecursively(resolverArgs: any): Promise<Balance[]> {
//   const { balances } = resolverArgs
//   const resolvedBalances: Balance[] = []

//   for (const { underlyings } of balances) {
//     for (const underlying of underlyings) {
//       const provider = underlying.adapterId
//       if (provider && getUnderlyingsBalances[provider]) {
//         const balancesForProvider = await getUnderlyingsBalances[provider](resolverArgs)
//       }
//     }
//   }

//   return resolvedBalances
// }

async function resolveUnderlyingRecursively(resolverArgs: any): Promise<Balance[]> {
  const { balances } = resolverArgs
  const resolvedBalances: Balance[] = []

  for (const balance of balances) {
    const currentUnderlyings: Balance[] = []

    if (balance.underlyings) {
      for (const underlying of balance.underlyings) {
        const provider = underlying.adapterId

        if (provider && getUnderlyingsBalances[provider]) {
          const balancesForProvider = await getUnderlyingsBalances[provider]({
            ...resolverArgs,
            balances: balance.underlyings.map((u: any) => ({ ...u, amount: balance.amount })),
          })

          // Replace the underlyings property of balancesForProvider with the current underlying object
          currentUnderlyings.push(...extractUnderlyingsFromBalances(balancesForProvider))

          // Recursion: If this underlying has its own underlyings, then we resolve those as well.
          if (underlying.underlyings && underlying.underlyings.length > 0) {
            const deeperBalances = await resolveUnderlyingRecursively({
              ...resolverArgs,
              balances: underlying.underlyings.map((u: any) => ({ ...u, amount: balance.amount })),
            })

            currentUnderlyings.push(...extractUnderlyingsFromBalances(deeperBalances))
          }
        }
      }

      balance.underlyings = currentUnderlyings
      resolvedBalances.push(balance)
    }
  }

  return resolvedBalances
}

function extractUnderlyingsFromBalances(balances: Balance[]): Balance[] {
  const underlyings: Balance[] = []
  for (const balance of balances) {
    if (balance.underlyings) {
      underlyings.push(...(balance.underlyings as Balance[]))
    }
  }
  return underlyings
}

export async function resolveUnderlyingsBalances<T extends BasicResolverArgs>(resolverArgs: T): Promise<Balance[]> {
  const { balances } = resolverArgs

  const initialUnderlyings = balances
    .filter((balance) => balance.amount !== 0n && balance.stakingToken)
    .map((balance) => ({
      ...balance,
      // Initial stakingToken becomes the first “underlying”.
      underlyings: [balance.stakingToken],
    }))

  const updatedBalances = await resolveUnderlyingRecursively({
    ...resolverArgs,
    balances: initialUnderlyings,
  })

  return updatedBalances
}
