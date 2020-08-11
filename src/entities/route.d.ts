import { ChainId } from '../constants';
import { Token } from './token';
import { Pair } from './pair';
import { Price } from './fractions/price';
import { Percent } from 'entities/fractions';
export interface SpitPath {
    path: Token[];
    percent: Percent;
}
export declare type RoutePath = RouteSplit[];
export interface RouteSplit {
    pairs: Pair[];
    percent: Percent;
}
export declare class Route {
    readonly route: RoutePath;
    readonly path: SpitPath[];
    readonly input: Token;
    readonly output: Token;
    readonly midPrice: Price;
    constructor(route: RoutePath, input: Token, output?: Token);
    get chainId(): ChainId;
}
