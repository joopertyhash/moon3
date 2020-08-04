import { ChainId } from '../constants';
/**
 * Represents an ERC20 token and Ether with a unique address and some metadata.
 */
export declare class Token {
    readonly chainId: ChainId;
    readonly address: string;
    readonly isEther: boolean;
    readonly decimals: number;
    readonly symbol: string | undefined;
    readonly name: string | undefined;
    constructor(chainId: ChainId, address: string, decimals: number, symbol?: string, name?: string);
    /**
     * Returns true if the two tokens are equivalent, i.e. have the same chainId and address.
     * @param other other token to compare
     */
    equals(other: Token): boolean;
}
/**
 * Compares two currencies for equality
 */
export declare function currencyEquals(currencyA: Token, currencyB: Token): boolean;
export declare const ETHER: Token;
