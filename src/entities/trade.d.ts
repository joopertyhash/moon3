import { TradeType } from '../constants';
import { Percent } from './fractions/percent';
import { Price } from './fractions/price';
import { TokenAmount } from './fractions/tokenAmount';
import { Route } from './route';
interface InputOutput {
    readonly inputAmount: TokenAmount;
    readonly outputAmount: TokenAmount;
}
export declare function inputOutputComparator(a: InputOutput, b: InputOutput): number;
export declare function tradeComparator(a: Trade, b: Trade): number;
export interface BestTradeOptions {
    maxNumResults?: number;
    maxHops?: number;
}
/**
 * Represents a trade executed against a list of pairs.
 * Does not account for slippage, i.e. trades that front run this trade and move the price.
 */
export declare class Trade {
    /**
     * The route of the trade, i.e. which pairs the trade goes through.
     */
    readonly route: Route;
    /**
     * The type of the trade, either exact in or exact out.
     */
    readonly tradeType: TradeType;
    /**
     * The input amount for the trade assuming no slippage.
     */
    readonly inputAmount: TokenAmount;
    /**
     * The output amount for the trade assuming no slippage.
     */
    readonly outputAmount: TokenAmount;
    /**
     * The price expressed in terms of output amount/input amount.
     */
    readonly executionPrice: Price;
    /**
     * The mid price after the trade executes assuming no slippage.
     */
    readonly nextMidPrice: Price;
    /**
     * The percent difference between the mid price before the trade and the trade execution price.
     */
    readonly priceImpact: Percent;
    /**
     * Constructs an exact in trade with the given amount in and route
     * @param route route of the exact in trade
     * @param amountIn the amount being passed in
     */
    static exactIn(route: Route, amountIn: TokenAmount): Trade;
    /**
     * Constructs an exact out trade with the given amount out and route
     * @param route route of the exact out trade
     * @param amountOut the amount returned by the trade
     */
    static exactOut(route: Route, amountOut: TokenAmount): Trade;
    constructor(route: Route, amount: TokenAmount, tradeType: TradeType);
    /**
     * Get the minimum amount that must be received from this trade for the given slippage tolerance
     * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
     */
    minimumAmountOut(slippageTolerance: Percent): TokenAmount;
    /**
     * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
     * @param slippageTolerance tolerance of unfavorable slippage from the execution price of this trade
     */
    maximumAmountIn(slippageTolerance: Percent): TokenAmount;
}
export {};
