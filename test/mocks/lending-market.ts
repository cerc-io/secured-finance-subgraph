/* eslint-disable @typescript-eslint/ban-types */
import { Address, BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as/assembly/index';
import {
    OrderExecuted,
    PreOrderExecuted,
    PositionUnwound,
    OrderCanceled,
    OrdersCleaned,
    ItayoseExecuted,
} from '../../generated/templates/LendingMarket/LendingMarket';

export function createOrderExecutedEvent(
    user: Address,
    side: i32,
    ccy: Bytes,
    maturity: BigInt,
    inputAmount: BigInt,
    inputUnitPrice: BigInt,
    filledAmount: BigInt,
    filledUnitPrice: BigInt,
    filledFutureValue: BigInt,
    placedOrderId: BigInt,
    placedAmount: BigInt,
    placedUnitPrice: BigInt,
    cbThresholdUnitPrice: BigInt
): OrderExecuted {
    const mockEvent = changetype<OrderExecuted>(newMockEvent());
    const event = new OrderExecuted(
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
        new ethereum.EventParam('user', ethereum.Value.fromAddress(user))
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
            'inputAmount',
            ethereum.Value.fromUnsignedBigInt(inputAmount)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'inputUnitPrice',
            ethereum.Value.fromUnsignedBigInt(inputUnitPrice)
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
            'filledUnitPrice',
            ethereum.Value.fromUnsignedBigInt(filledUnitPrice)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'filledFutureValue',
            ethereum.Value.fromUnsignedBigInt(filledFutureValue)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'placedOrderId',
            ethereum.Value.fromUnsignedBigInt(placedOrderId)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'placedAmount',
            ethereum.Value.fromUnsignedBigInt(placedAmount)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'placedUnitPrice',
            ethereum.Value.fromUnsignedBigInt(placedUnitPrice)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'cbThresholdUnitPrice',
            ethereum.Value.fromUnsignedBigInt(cbThresholdUnitPrice)
        )
    );

    return event;
}

export function createPreOrderExecutedEvent(
    user: Address,
    side: i32,
    ccy: Bytes,
    maturity: BigInt,
    amount: BigInt,
    unitPrice: BigInt,
    orderId: BigInt
): PreOrderExecuted {
    const mockEvent = changetype<PreOrderExecuted>(newMockEvent());
    const event = new PreOrderExecuted(
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
        new ethereum.EventParam('user', ethereum.Value.fromAddress(user))
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
    event.parameters.push(
        new ethereum.EventParam(
            'orderId',
            ethereum.Value.fromUnsignedBigInt(orderId)
        )
    );

    return event;
}

export function createPositionUnwoundEvent(
    user: Address,
    side: i32,
    ccy: Bytes,
    maturity: BigInt,
    futureValue: BigInt,
    filledAmount: BigInt,
    filledUnitPrice: BigInt,
    filledFutureValue: BigInt,
    cbThresholdUnitPrice: BigInt
): PositionUnwound {
    const mockEvent = changetype<PositionUnwound>(newMockEvent());

    const event = new PositionUnwound(
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
        new ethereum.EventParam('user', ethereum.Value.fromAddress(user))
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
            'futureValue',
            ethereum.Value.fromUnsignedBigInt(futureValue)
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
            'filledUnitPrice',
            ethereum.Value.fromUnsignedBigInt(filledUnitPrice)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'filledFutureValue',
            ethereum.Value.fromUnsignedBigInt(filledFutureValue)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'cbThresholdUnitPrice',
            ethereum.Value.fromUnsignedBigInt(cbThresholdUnitPrice)
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

export function createOrdersCleanedEvent(
    orderIds: Array<BigInt>,
    maker: Address,
    side: i32,
    ccy: Bytes,
    maturity: BigInt,
    amount: BigInt,
    futureValue: BigInt
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
    event.parameters.push(
        new ethereum.EventParam(
            'amount',
            ethereum.Value.fromUnsignedBigInt(amount)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'futureValue',
            ethereum.Value.fromUnsignedBigInt(futureValue)
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

export function createItayoseExecutedEvent(
    ccy: Bytes,
    maturity: BigInt,
    openingUnitPrice: BigInt,
    lastLendUnitPrice: BigInt,
    lastBorrowUnitPrice: BigInt,
    offsetAmount: BigInt
): ItayoseExecuted {
    const mockEvent = newMockEvent();
    const event = new ItayoseExecuted(
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
            'openingUnitPrice',
            ethereum.Value.fromUnsignedBigInt(openingUnitPrice)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'lastLendUnitPrice',
            ethereum.Value.fromUnsignedBigInt(lastLendUnitPrice)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'lastBorrowUnitPrice',
            ethereum.Value.fromUnsignedBigInt(lastBorrowUnitPrice)
        )
    );
    event.parameters.push(
        new ethereum.EventParam(
            'offsetAmount',
            ethereum.Value.fromUnsignedBigInt(offsetAmount)
        )
    );
    return event;
}
