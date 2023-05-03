/* eslint-disable @typescript-eslint/ban-types */
import { Address, BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as/assembly/index';
import {
    OrderCanceled,
    OrdersCleaned,
    OrderMade,
    OrdersTaken,
    OrderPartiallyTaken,
} from '../../generated/templates/LendingMarket/LendingMarket';

export function createOrderMadeEvent(
    orderId: BigInt,
    originalOrderId: BigInt,
    maker: Address,
    side: i32,
    ccy: Bytes,
    maturity: BigInt,
    amount: BigInt,
    unitPrice: BigInt
): OrderMade {
    const mockEvent = changetype<OrderMade>(newMockEvent());
    const event = new OrderMade(
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
        new ethereum.EventParam(
            'orderId',
            ethereum.Value.fromUnsignedBigInt(orderId)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'originalOrderId',
            ethereum.Value.fromUnsignedBigInt(originalOrderId)
        )
    );
    event.parameters.push(
        new ethereum.EventParam('maker', ethereum.Value.fromAddress(maker))
    );
    event.parameters.push(
        new ethereum.EventParam('side', ethereum.Value.fromI32(side))
    );
    event.parameters.push(
        new ethereum.EventParam('ccy', ethereum.Value.fromBytes(ccy))
    );
    event.parameters.push(
        new ethereum.EventParam(
            'maturity',
            ethereum.Value.fromUnsignedBigInt(maturity)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'amount',
            ethereum.Value.fromUnsignedBigInt(amount)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'unitPrice',
            ethereum.Value.fromUnsignedBigInt(unitPrice)
        )
    );

    return event;
}

export function createOrdersTakenEvent(
    taker: Address,
    side: i32,
    ccy: Bytes,
    maturity: BigInt,
    filledAmount: BigInt,
    unitPrice: BigInt,
    filledFutureValue: BigInt,
    hash: Address | null = null
): OrdersTaken {
    const mockEvent = changetype<OrdersTaken>(newMockEvent());
    if (hash) {
        mockEvent.transaction.hash = hash;
    }

    const event = new OrdersTaken(
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
        new ethereum.EventParam('taker', ethereum.Value.fromAddress(taker))
    );
    event.parameters.push(
        new ethereum.EventParam('side', ethereum.Value.fromI32(side))
    );
    event.parameters.push(
        new ethereum.EventParam('ccy', ethereum.Value.fromBytes(ccy))
    );
    event.parameters.push(
        new ethereum.EventParam(
            'maturity',
            ethereum.Value.fromUnsignedBigInt(maturity)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'filledAmount',
            ethereum.Value.fromUnsignedBigInt(filledAmount)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'unitPrice',
            ethereum.Value.fromUnsignedBigInt(unitPrice)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'filledFutureValue',
            ethereum.Value.fromUnsignedBigInt(filledFutureValue)
        )
    );

    return event;
}

export function createOrderCanceledEvent(
    orderId: BigInt,
    maker: Address,
    side: i32,
    ccy: Bytes,
    maturity: BigInt,
    amount: BigInt,
    unitPrice: BigInt
): OrderCanceled {
    const mockEvent = changetype<OrderCanceled>(newMockEvent());
    const event = new OrderCanceled(
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
        new ethereum.EventParam(
            'orderId',
            ethereum.Value.fromUnsignedBigInt(orderId)
        )
    );
    event.parameters.push(
        new ethereum.EventParam('maker', ethereum.Value.fromAddress(maker))
    );
    event.parameters.push(
        new ethereum.EventParam('side', ethereum.Value.fromI32(side))
    );
    event.parameters.push(
        new ethereum.EventParam('ccy', ethereum.Value.fromBytes(ccy))
    );
    event.parameters.push(
        new ethereum.EventParam(
            'maturity',
            ethereum.Value.fromUnsignedBigInt(maturity)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'amount',
            ethereum.Value.fromUnsignedBigInt(amount)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'unitPrice',
            ethereum.Value.fromUnsignedBigInt(unitPrice)
        )
    );

    return event;
}

export function createOrdersCleaned(
    orderIds: Array<BigInt>,
    maker: Address,
    side: i32,
    ccy: Bytes,
    maturity: BigInt
): OrdersCleaned {
    const mockEvent = changetype<OrdersCleaned>(newMockEvent());
    const event = new OrdersCleaned(
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
        new ethereum.EventParam(
            'orderIds',
            ethereum.Value.fromUnsignedBigIntArray(orderIds)
        )
    );
    event.parameters.push(
        new ethereum.EventParam('maker', ethereum.Value.fromAddress(maker))
    );
    event.parameters.push(
        new ethereum.EventParam('side', ethereum.Value.fromI32(side))
    );
    event.parameters.push(
        new ethereum.EventParam('ccy', ethereum.Value.fromBytes(ccy))
    );
    event.parameters.push(
        new ethereum.EventParam(
            'maturity',
            ethereum.Value.fromUnsignedBigInt(maturity)
        )
    );

    return event;
}

export function createOrderPartiallyTakenEvent(
    orderId: BigInt,
    maker: Address,
    side: i32,
    ccy: Bytes,
    maturity: BigInt,
    filledAmount: BigInt,
    filledFutureValue: BigInt
): OrderPartiallyTaken {
    const mockEvent = newMockEvent();
    const event = new OrderPartiallyTaken(
        mockEvent.address,
        mockEvent.logIndex,
        mockEvent.transactionLogIndex,
        mockEvent.logType,
        mockEvent.block,
        mockEvent.transaction,
        mockEvent.parameters,
        mockEvent.receipt
    );

    event.parameters = new Array();
    event.parameters.push(
        new ethereum.EventParam(
            'orderId',
            ethereum.Value.fromUnsignedBigInt(orderId)
        )
    );
    event.parameters.push(
        new ethereum.EventParam('maker', ethereum.Value.fromAddress(maker))
    );
    event.parameters.push(
        new ethereum.EventParam('side', ethereum.Value.fromI32(side))
    );
    event.parameters.push(
        new ethereum.EventParam('ccy', ethereum.Value.fromBytes(ccy))
    );
    event.parameters.push(
        new ethereum.EventParam(
            'maturity',
            ethereum.Value.fromUnsignedBigInt(maturity)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'filledAmount',
            ethereum.Value.fromUnsignedBigInt(filledAmount)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'filledFutureValue',
            ethereum.Value.fromUnsignedBigInt(filledFutureValue)
        )
    );
    return event;
}
