import invariant from 'tiny-invariant';
import { ONE, TradeType, ZERO } from '../constants';
import { Fraction } from './fractions/fraction';
import { Percent } from './fractions/percent';
import { Price } from './fractions/price';
import { TokenAmount } from './fractions/tokenAmount';
import { Route } from './route';
import { currencyEquals } from './token';
/**
 * Returns the percent difference between the mid price and the execution price, i.e. price impact.
 * @param midPrice mid price before the trade
 * @param inputAmount the input amount of the trade
 * @param outputAmount the output amount of the trade
 */
function computePriceImpact(midPrice, inputAmount, outputAmount) {
    const exactQuote = midPrice.raw.multiply(inputAmount.raw);
    // calculate slippage := (exactQuote - outputAmount) / exactQuote
    const slippage = exactQuote.subtract(outputAmount.raw).divide(exactQuote);
    return new Percent(slippage.numerator, slippage.denominator);
}
// comparator function that allows sorting trades by their output amounts, in decreasing order, and then input amounts
// in increasing order. i.e. the best trades have the most outputs for the least inputs and are sorted first
export function inputOutputComparator(a, b) {
    // must have same input and output token for comparison
    invariant(currencyEquals(a.inputAmount.token, b.inputAmount.token), 'INPUT_CURRENCY');
    invariant(currencyEquals(a.outputAmount.token, b.outputAmount.token), 'OUTPUT_CURRENCY');
    if (a.outputAmount.equalTo(b.outputAmount)) {
        if (a.inputAmount.equalTo(b.inputAmount)) {
            return 0;
        }
        // trade A requires less input than trade B, so A should come first
        if (a.inputAmount.lessThan(b.inputAmount)) {
            return -1;
        }
        else {
            return 1;
        }
    }
    else {
        // tradeA has less output than trade B, so should come second
        if (a.outputAmount.lessThan(b.outputAmount)) {
            return 1;
        }
        else {
            return -1;
        }
    }
}
// extension of the input output comparator that also considers other dimensions of the trade in ranking them
export function tradeComparator(a, b) {
    const ioComp = inputOutputComparator(a, b);
    if (ioComp !== 0) {
        return ioComp;
    }
    // consider lowest slippage next, since these are less likely to fail
    if (a.priceImpact.lessThan(b.priceImpact)) {
        return -1;
    }
    else if (a.priceImpact.greaterThan(b.priceImpact)) {
        return 1;
    }
    // finally consider the number of hops since each hop costs gas
    return a.route.path.length - b.route.path.length;
}
/**
 * Represents a trade executed against a list of pairs.
 * Does not account for slippage, i.e. trades that front run this trade and move the price.
 */
export class Trade {
    constructor(route, amount, tradeType) {
        const amounts = new Array(route.route.length);
        const nextPairs = new Array(route.route.length);
        if (tradeType === TradeType.EXACT_INPUT) {
            invariant(currencyEquals(amount.token, route.input), 'INPUT');
            for (let j = 0; j < route.route.length - 1; j++) {
                const pairs = route.route[j].pairs;
                amounts[j] = new Array(route.route[j].pairs.length);
                nextPairs[j] = route.route[j];
                amounts[j][0] = amount;
                for (let i = 0; i < pairs.length; i++) {
                    const [outputAmount] = pairs[i].getOutputAmount(amounts[j][i]);
                    amounts[j][i + 1] = outputAmount;
                }
            }
        }
        else {
            throw new Error('EXACT_OUTPUT currently does not support');
            // invariant(currencyEquals(amount.token, route.output), 'OUTPUT')
            // for (let i = route.route.length - 1; i > 0; i--) {
            //
            //   const pairs = route.route[i].pairs;
            //   const currentNextPairs: Pair[] = new Array(pairs.length)
            //   const currentAmounts: TokenAmount[] = new Array(pairs.length)
            //   amounts[currentAmounts.length - 1] = pairs[pairs.length - 1]
            //
            //   for (let j = pairs.length - 1; j > 0 ; j--) {
            //     const pair = pairs[j - 1]
            //     const [inputAmount, nextPair] = pair.getInputAmount(amounts[j])
            //     currentAmounts[j - 1] = inputAmount
            //     currentNextPairs[j - 1] = nextPair
            //   }
        }
        this.route = route;
        this.tradeType = tradeType;
        this.inputAmount = tradeType === TradeType.EXACT_INPUT ? amount : amounts[0][0];
        // this.outputAmount = tradeType === TradeType.EXACT_OUTPUT ? amount : amounts[amounts.length - 1][amounts[amounts.length - 1].length - 1]
        this.outputAmount = amounts[amounts.length - 1][amounts[amounts.length - 1].length - 1];
        this.executionPrice = new Price(this.inputAmount.token, this.outputAmount.token, this.inputAmount.raw, this.outputAmount.raw);
        this.nextMidPrice = Price.fromRoute(new Route(nextPairs, route.input));
        this.priceImpact = computePriceImpact(route.midPrice, this.inputAmount, this.outputAmount);
    }
    /**
     * Constructs an exact in trade with the given amount in and route
     * @param route route of the exact in trade
     * @param amountIn the amount being passed in
     */
    static exactIn(route, amountIn) {
        return new Trade(route, amountIn, TradeType.EXACT_INPUT);
    }
    /**
     * Constructs an exact out trade with the given amount out and route
     * @param route route of the exact out trade
     * @param amountOut the amount returned by the trade
     */
    static exactOut(route, amountOut) {
        return new Trade(route, amountOut, TradeType.EXACT_OUTPUT);
    }
    /**
     * Get the minimum amount that must be received from this trade for the given slippage tolerance
     * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
     */
    minimumAmountOut(slippageTolerance) {
        invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE');
        if (this.tradeType === TradeType.EXACT_INPUT) {
            return this.outputAmount;
        }
        else {
            const slippageAdjustedAmountOut = new Fraction(ONE)
                .add(slippageTolerance)
                .invert()
                .multiply(this.outputAmount.raw).quotient;
            return new TokenAmount(this.outputAmount.token, slippageAdjustedAmountOut);
        }
    }
    /**
     * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
     * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
     */
    maximumAmountIn(slippageTolerance) {
        invariant(!slippageTolerance.lessThan(ZERO), 'SLIPPAGE_TOLERANCE');
        if (this.tradeType === TradeType.EXACT_INPUT) {
            return this.inputAmount;
        }
        else {
            const slippageAdjustedAmountIn = new Fraction(ONE).add(slippageTolerance).multiply(this.inputAmount.raw).quotient;
            return new TokenAmount(this.inputAmount.token, slippageAdjustedAmountIn);
        }
    }
}
//# sourceMappingURL=trade.js.map