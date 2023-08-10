import { BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as/assembly/index';
import {
    OrderBookCreated,
    OrderBooksRotated,
} from '../../generated/LendingMarketOperationLogic/LendingMarketController';

export function createOrderBookCreatedEvent(
    ccy: Bytes,
    orderBookId: BigInt,
    openingDate: BigInt,
    maturity: BigInt
): OrderBookCreated {
    const mockEvent = changetype<OrderBookCreated>(newMockEvent());
    const event = new OrderBookCreated(
        mockEvent.address,
        mockEvent.logIndex,
        mockEvent.transactionLogIndex,
        mockEvent.logType,
        mockEvent.block,
        mockEvent.transaction,
        mockEvent.parameters,
        mockEvent.receipt
    );
    event.parameters = [];

    event.parameters.push(
        new ethereum.EventParam('ccy', ethereum.Value.fromBytes(ccy))
    );
    event.parameters.push(
        new ethereum.EventParam(
            'orderBookId',
            ethereum.Value.fromUnsignedBigInt(orderBookId)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'openingDate',
            ethereum.Value.fromUnsignedBigInt(openingDate)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'maturity',
            ethereum.Value.fromUnsignedBigInt(maturity)
        )
    );

    return event;
}

export function createOrderBooksRotatedEvent(
    ccy: Bytes,
    oldMaturity: BigInt,
    newMaturity: BigInt
): OrderBooksRotated {
    const mockEvent = changetype<OrderBooksRotated>(newMockEvent());
    const event = new OrderBooksRotated(
        mockEvent.address,
        mockEvent.logIndex,
        mockEvent.transactionLogIndex,
        mockEvent.logType,
        mockEvent.block,
        mockEvent.transaction,
        mockEvent.parameters,
        mockEvent.receipt
    );

    event.parameters = [];

    event.parameters.push(
        new ethereum.EventParam('ccy', ethereum.Value.fromBytes(ccy))
    );

    event.parameters.push(
        new ethereum.EventParam(
            'oldMaturity',
            ethereum.Value.fromUnsignedBigInt(oldMaturity)
        )
    );

    event.parameters.push(
        new ethereum.EventParam(
            'newMaturity',
            ethereum.Value.fromUnsignedBigInt(newMaturity)
        )
    );

    return event;
}

export function toArrayString(array: Array<string>): string {
    return `[${array.map<string>(item => item.toString()).join(', ')}]`;
}
