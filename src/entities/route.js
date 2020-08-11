import invariant from 'tiny-invariant';
import { Price } from './fractions/price';
export class Route {
    constructor(route, input, output) {
        invariant(route.length > 0, 'PAIRS');
        const chainId = route[0].pairs[0].chainId;
        invariant(route.every(split => split.pairs.every(pair => chainId === pair.chainId)), 'CHAIN_IDS');
        invariant((route[0].pairs.every(pair => pair.involvesToken(input))), 'INPUT');
        invariant(typeof output === 'undefined' ||
            (route[route.length - 1].pairs.every(pair => pair.involvesToken(output))), 'OUTPUT');
        const path = [];
        for (const split of route) {
            const splitPath = {
                path: [input],
                percent: split.percent
            };
            for (const [i, pair] of split.pairs.entries()) {
                const currentInput = splitPath.path[i];
                const output = currentInput.equals(pair.token0) ? pair.token1 : pair.token0;
                splitPath.path.push(output);
            }
            path.push(splitPath);
        }
        this.route = route;
        this.path = path;
        this.midPrice = Price.fromRoute(this);
        this.input = input;
        this.output = output !== null && output !== void 0 ? output : path[path.length - 1].path[0];
    }
    get chainId() {
        return this.route[0].pairs[0].chainId;
    }
}
//# sourceMappingURL=route.js.map