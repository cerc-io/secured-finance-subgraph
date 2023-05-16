import {
    Address,
    BigDecimal,
    BigInt,
    Bytes,
    log,
    store,
} from '@graphprotocol/graph-ts';
import { Order, Transaction } from '../generated/schema';
import {
    OrderCanceled,
    OrdersCleaned,
    OrderMade,
    OrdersTaken,
    OrderPartiallyTaken,
} from '../generated/templates/LendingMarket/LendingMarket';
import {
    getOrInitDailyVolume,
    getOrInitLendingMarket,
    getOrInitUser,
} from './helper/initializer';

export function handleOrderMade(event: OrderMade): void {
    const orderId = event.params.orderId.toHexString();
    const order = new Order(orderId);

    order.status = 'Open';
    order.orderId = event.params.orderId;
    order.originalOrderId = event.params.originalOrderId;
    order.amount = event.params.amount;
    order.filledAmount = BigInt.fromI32(0);
    if (order.originalOrderId) {
        const originalOrder = Order.load(order.originalOrderId.toHexString());
        if (originalOrder) {
            originalOrder.amount = originalOrder.amount.minus(order.amount);
            originalOrder.save();
        }
    }
    order.maker = getOrInitUser(event.params.maker).id;
    order.currency = event.params.ccy;
    order.side = event.params.side;
    order.maturity = event.params.maturity;
    order.unitPrice = event.params.unitPrice;
    order.lendingMarket = getOrInitLendingMarket(
        event.params.ccy,
        event.params.maturity
    ).id;

    order.createdAt = event.block.timestamp;
    order.blockNumber = event.block.number;
    order.txHash = event.transaction.hash;

    order.save();
}

export function handleOrdersTaken(event: OrdersTaken): void {
    createTransaction(
        event.transaction.hash.toHexString(),
        event.params.unitPrice,
        event.params.taker,
        event.params.ccy,
        event.params.maturity,
        event.params.side,
        event.params.filledAmount,
        event.params.filledFutureValue,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash
    );
    addToTransactionVolume(event);
}

export function handleOrderCanceled(event: OrderCanceled): void {
    const id = event.params.orderId;
    let order = Order.load(id.toHexString());
    if (order === null) {
        order = new Order(id.toHexString());
    }

    order.status = 'Cancelled';
    order.save();
}

export function handleOrdersCleaned(event: OrdersCleaned): void {
    for (let i = 0; i < event.params.orderIds.length; i++) {
        const id = event.params.orderIds[i].toHexString();
        const order = Order.load(id);

        if (order != null) {
            createTransaction(
                event.transaction.hash.toHexString() + '-' + i.toString(),
                order.unitPrice,
                Address.fromString(order.maker),
                order.currency,
                order.maturity,
                order.side,
                order.amount.minus(order.filledAmount),
                calculateForwardValue(order.amount, order.unitPrice),
                event.block.timestamp,
                event.block.number,
                event.transaction.hash
            );

            order.filledAmount = order.amount;
            order.status = 'Filled';
            order.save();
        }
    }
}

export function handleOrderPartiallyTaken(event: OrderPartiallyTaken): void {
    const id = event.params.orderId;
    let order = Order.load(id.toHexString());
    if (order) {
        order.filledAmount = event.params.filledAmount;

        createTransaction(
            event.transaction.hash.toHexString(),
            order.unitPrice,
            event.params.maker,
            event.params.ccy,
            event.params.maturity,
            event.params.side,
            event.params.filledAmount,
            event.params.filledFutureValue,
            event.block.timestamp,
            event.block.number,
            event.transaction.hash
        );

        order.save();
    }
}

function createTransaction(
    txId: string,
    unitPrice: BigInt,
    taker: Address,
    ccy: Bytes,
    maturity: BigInt,
    side: i32,
    filledAmount: BigInt,
    filledFutureValue: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt,
    txHash: Bytes
): void {
    const transaction = new Transaction(txId);

    transaction.orderPrice = unitPrice;
    transaction.taker = getOrInitUser(taker).id;
    transaction.currency = ccy;
    transaction.maturity = maturity;
    transaction.side = side;

    transaction.forwardValue = filledFutureValue;
    transaction.amount = filledAmount;

    transaction.averagePrice = !filledFutureValue.isZero()
        ? filledAmount.divDecimal(new BigDecimal(filledFutureValue))
        : BigDecimal.zero();

    transaction.createdAt = timestamp;
    transaction.blockNumber = blockNumber;
    transaction.txHash = txHash;

    transaction.lendingMarket = getOrInitLendingMarket(ccy, maturity).id;

    transaction.save();
}

function addToTransactionVolume(event: OrdersTaken): void {
    // We expect to have a transaction entity created in the handleOrdersTaken
    const transaction = Transaction.load(event.transaction.hash.toHexString());
    if (transaction) {
        const dailyVolume = getOrInitDailyVolume(
            transaction.currency,
            transaction.maturity,
            event.block.timestamp
        );
        dailyVolume.volume = dailyVolume.volume.plus(transaction.amount);
        dailyVolume.save();
    } else {
        log.error('Transaction entity not found: {}', [
            event.transaction.hash.toHexString(),
        ]);
    }
}

function calculateForwardValue(amount: BigInt, unitPrice: BigInt): BigInt {
    return (amount * BigInt.fromI32(100)).div(unitPrice);
}
