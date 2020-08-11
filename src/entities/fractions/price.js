import { currencyEquals } from '../token';
import { TokenAmount } from './tokenAmount';
import invariant from 'tiny-invariant';
import JSBI from 'jsbi';
import { TEN } from '../../constants';
import { Fraction } from './fraction';
export class Price extends Fraction {
    // denominator and numerator _must_ be raw, i.e. in the native representation
    constructor(baseCurrency, quoteCurrency, denominator, numerator) {
        super(numerator, denominator);
        this.baseCurrency = baseCurrency;
        this.quoteCurrency = quoteCurrency;
        this.scalar = new Fraction(JSBI.exponentiate(TEN, JSBI.BigInt(baseCurrency.decimals)), JSBI.exponentiate(TEN, JSBI.BigInt(quoteCurrency.decimals)));
    }
    static fromRoute(route) {
        const prices = [];
        for (const [j, split] of route.route.entries()) {
            const splitPrices = [];
            for (const [i, pair] of split.pairs.entries()) {
                splitPrices.push(route.path[j].path[i].equals(pair.token0)
                    ? new Price(pair.reserve0.token, pair.reserve1.token, pair.reserve0.raw, pair.reserve1.raw)
                    : new Price(pair.reserve1.token, pair.reserve0.token, pair.reserve1.raw, pair.reserve0.raw));
            }
            prices.push(splitPrices);
        }
        const midPrices = prices.map((currentValue) => {
            return currentValue.slice(1).reduce((acc, val) => acc.multiply(val), currentValue[0]);
        });
        return midPrices.slice(1).reduce((accumulator, currentValue, i) => {
            const currentPercent = route.path[i].percent;
            return accumulator.multiplyWithPercent(currentValue, currentPercent);
        }, midPrices[0]);
    }
    get raw() {
        return new Fraction(this.numerator, this.denominator);
    }
    get adjusted() {
        return super.multiply(this.scalar);
    }
    invert() {
        return new Price(this.quoteCurrency, this.baseCurrency, this.numerator, this.denominator);
    }
    multiply(other) {
        invariant(currencyEquals(this.quoteCurrency, other.baseCurrency), 'TOKEN');
        const fraction = super.multiply(other);
        return new Price(this.baseCurrency, other.quoteCurrency, fraction.denominator, fraction.numerator);
    }
    multiplyWithPercent(other, percent) {
        invariant(currencyEquals(this.quoteCurrency, other.baseCurrency), 'TOKEN');
        const fraction = super.multiply(other);
        const denominatorFromPercent = JSBI.multiply(fraction.denominator, percent.quotient);
        const numeratorFromPercent = JSBI.multiply(fraction.numerator, percent.quotient);
        return new Price(this.baseCurrency, other.quoteCurrency, denominatorFromPercent, numeratorFromPercent);
    }
    // performs floor division on overflow
    quote(currencyAmount) {
        invariant(currencyEquals(currencyAmount.token, this.baseCurrency), 'TOKEN');
        return new TokenAmount(this.quoteCurrency, super.multiply(currencyAmount.raw).quotient);
    }
    toSignificant(significantDigits = 6, format, rounding) {
        return this.adjusted.toSignificant(significantDigits, format, rounding);
    }
    toFixed(decimalPlaces = 4, format, rounding) {
        return this.adjusted.toFixed(decimalPlaces, format, rounding);
    }
}
//# sourceMappingURL=price.js.map