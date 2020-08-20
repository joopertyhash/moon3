import { currencyEquals, Token } from '../token'
import { TokenAmount } from './tokenAmount'
import invariant from 'tiny-invariant'
import JSBI from 'jsbi'

import { BigintIsh, Rounding, TEN } from '../../constants'
import { Route } from '../route'
import { Fraction } from './fraction'
import { Percent } from 'entities';

export class Price extends Fraction {
    public readonly baseCurrency: Token // input i.e. denominator
    public readonly quoteCurrency: Token // output i.e. numerator
    public readonly scalar: Fraction // used to adjust the raw fraction w/r/t the decimals of the {base,quote}Token

    public static fromRoute(route: Route): Price {
        const prices: Price[][] = []
        for (const [j, split] of route.route.entries()) {
            const splitPrices = []
            for (const [i, pair] of split.pairs.entries()) {
                splitPrices.push(
                    route.path[j].path[i].equals(pair.token0)
                        ? new Price(pair.reserve0.token, pair.reserve1.token, pair.reserve0.raw, pair.reserve1.raw)
                        : new Price(pair.reserve1.token, pair.reserve0.token, pair.reserve1.raw, pair.reserve0.raw)
                )
            }
            prices.push(splitPrices)
        }

        /*
         very very very bad, I want to cry
         but we need it fast to allow users get better price as soon as possible
        */
        return prices[0][0];
        // const midPrices = prices.map((currentValue: Price[]) => {
        //     return currentValue.slice(1).reduce((acc, val) => acc.multiply(val), currentValue[0])
        // })
        //
        // return midPrices.slice(1).reduce((accumulator: Price, currentValue: Price, i: number ) => {
        //     const currentPercent = route.path[i].percent;
        //     return accumulator.multiplyWithPercent(currentValue, currentPercent)
        // }, midPrices[0])
    }

    // denominator and numerator _must_ be raw, i.e. in the native representation
    public constructor(baseCurrency: Token, quoteCurrency: Token, denominator: BigintIsh, numerator: BigintIsh) {
        super(numerator, denominator)

        this.baseCurrency = baseCurrency
        this.quoteCurrency = quoteCurrency
        this.scalar = new Fraction(
            JSBI.exponentiate(TEN, JSBI.BigInt(baseCurrency.decimals)),
            JSBI.exponentiate(TEN, JSBI.BigInt(quoteCurrency.decimals))
        )
    }

    public get raw(): Fraction {
        return new Fraction(this.numerator, this.denominator)
    }

    public get adjusted(): Fraction {
        return super.multiply(this.scalar)
    }

    public invert(): Price {
        return new Price(this.quoteCurrency, this.baseCurrency, this.numerator, this.denominator)
    }

    public multiply(other: Price): Price {
        invariant(currencyEquals(this.quoteCurrency, other.baseCurrency), 'TOKEN')
        const fraction = super.multiply(other)
        return new Price(this.baseCurrency, other.quoteCurrency, fraction.denominator, fraction.numerator)
    }

    public multiplyWithPercent(other: Price, percent: Percent): Price {
        invariant(currencyEquals(this.quoteCurrency, other.baseCurrency), 'TOKEN')
        const fraction = super.multiply(other)
        const denominatorFromPercent = JSBI.multiply(fraction.denominator, percent.quotient)
        const numeratorFromPercent = JSBI.multiply(fraction.numerator, percent.quotient)
        return new Price(this.baseCurrency, other.quoteCurrency, denominatorFromPercent, numeratorFromPercent)
    }

    // performs floor division on overflow
    public quote(currencyAmount: TokenAmount): TokenAmount {
        invariant(currencyEquals(currencyAmount.token, this.baseCurrency), 'TOKEN')
        return new TokenAmount(this.quoteCurrency, super.multiply(currencyAmount.raw).quotient)
    }

    public toSignificant(significantDigits: number = 6, format?: object, rounding?: Rounding): string {
        return this.adjusted.toSignificant(significantDigits, format, rounding)
    }

    public toFixed(decimalPlaces: number = 4, format?: object, rounding?: Rounding): string {
        return this.adjusted.toFixed(decimalPlaces, format, rounding)
    }
}
