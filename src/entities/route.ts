import { ChainId } from '../constants'
import invariant from 'tiny-invariant'

import { Token } from './token'
import { Pair } from './pair'
import { Price } from './fractions/price'
import { Percent } from 'entities/fractions';

export interface SpitPath {
  path: Token[]
  percent: Percent
}

export type RoutePath = RouteSplit[]

export interface RouteSplit {
  pairs: Pair[]
  percent: Percent
}

export class Route {
  public readonly route: RoutePath
  public readonly path: SpitPath[]
  public readonly input: Token
  public readonly output: Token
  public readonly midPrice: Price

  public constructor(route: RoutePath, input: Token, output?: Token) {
    invariant(route.length > 0, 'PAIRS')
    const chainId = route[0].pairs[0].chainId;
    invariant(
        route.every(split => split.pairs.every(pair => chainId === pair.chainId)),
      'CHAIN_IDS'
    )
    // invariant(
    //   (route[0].pairs.every(pair => pair.involvesToken(input))),
    //   'INPUT'
    // )
    // invariant(
    //   typeof output === 'undefined' ||
    //     (route[route.length - 1].pairs.every(pair => pair.involvesToken(output))),
    //   'OUTPUT'
    // )

    const path: SpitPath[] = []
    for (const split of route) {

      const splitPath: SpitPath = {
        path: [input],
        percent: split.percent
      }

      for (const [i, pair] of split.pairs.entries()) {
        const currentInput = splitPath.path[i]
        const output = currentInput.equals(pair.token0) ? pair.token1 : pair.token0
        splitPath.path.push(output)
      }

      path.push(splitPath)
    }

    this.route = route
    this.path = path
    this.midPrice = Price.fromRoute(this)
    this.input = input
    this.output = output ?? path[path.length - 1].path[0]
  }

  public get chainId(): ChainId {
    return this.route[0].pairs[0].chainId
  }
}
