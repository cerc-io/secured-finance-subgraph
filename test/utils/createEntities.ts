import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';
import { getOrInitLendingMarket } from '../../src/helper/initializer';

export const ALICE = Address.fromString(
    '0xc0ffee254729296a45a3885639AC7E10F9d54979'
);
export const BOB = Address.fromString(
    '0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E'
);

export function createLendingMarket(ccy: Bytes, maturity: BigInt): void {
    getOrInitLendingMarket(ccy, maturity);
}
