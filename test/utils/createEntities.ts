import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import { getOrInitLendingMarket } from '../../src/helper/initializer';
import { handleTakeOrders } from '../../src/lending-market';
import { createTakeOrdersEvent } from '../mocks';

export const ALICE = Address.fromString(
    '0xc0ffee254729296a45a3885639AC7E10F9d54979'
);
export const BOB = Address.fromString(
    '0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E'
);

export function createTransaction(
    taker: Address,
    side: i32,
    ccy: Bytes,
    maturity: BigInt,
    filledAmount: BigInt,
    unitPrice: BigInt,
    filledFutureValue: BigInt,
    hash: Address | null = null,
    timestamp: i32 = 0
): void {
    const takeOrdersEvent = createTakeOrdersEvent(
        taker,
        side,
        ccy,
        maturity,
        filledAmount,
        unitPrice,
        filledFutureValue,
        hash
    );
    if (timestamp) takeOrdersEvent.block.timestamp = BigInt.fromI32(timestamp);
    handleTakeOrders(takeOrdersEvent);
}

export function createLendingMarket(ccy: Bytes, maturity: BigInt): void {
    const event = newMockEvent();
    getOrInitLendingMarket(
        ccy,
        maturity,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash
    );
}