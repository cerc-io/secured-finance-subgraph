import { BigDecimal, BigInt, log } from '@graphprotocol/graph-ts';
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

    order.createdAt = event.block.timestamp;
    order.blockNumber = event.block.number;
    order.txHash = event.transaction.hash;

    order.save();
}

export function handleOrdersTaken(event: OrdersTaken): void {
    createTransaction(event);
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
        const id = event.params.orderIds[i];
        let order = Order.load(id.toHexString());
        if (order === null) {
            order = new Order(id.toHexString());
        }

        order.status = 'Filled';
        order.save();
    }
}

export function handleOrderPartiallyTaken(event: OrderPartiallyTaken): void {
    const id = event.params.orderId;
    let order = Order.load(id.toHexString());
    if (order) {
        order.amount -= event.params.filledAmount;

        createTransactionForPartialTakenOrder(event, order.unitPrice);

        order.save();
    }
}

function createTransaction(event: OrdersTaken): void {
    const transaction = new Transaction(event.transaction.hash.toHexString());

    transaction.orderPrice = event.params.unitPrice;
    transaction.taker = getOrInitUser(event.params.taker).id;
    transaction.currency = event.params.ccy;
    transaction.maturity = event.params.maturity;
    transaction.side = event.params.side;

    transaction.forwardValue = event.params.filledFutureValue;
    transaction.amount = event.params.filledAmount;

    transaction.averagePrice = !event.params.filledFutureValue.isZero()
        ? event.params.filledAmount.divDecimal(
              new BigDecimal(event.params.filledFutureValue)
          )
        : BigDecimal.zero();

    transaction.createdAt = event.block.timestamp;
    transaction.blockNumber = event.block.number;
    transaction.txHash = event.transaction.hash;

    transaction.lendingMarket = getOrInitLendingMarket(
        transaction.currency,
        transaction.maturity
    ).id;

    transaction.save();
}

function createTransactionForPartialTakenOrder(
    event: OrderPartiallyTaken,
    unitPrice: BigInt
): void {
    const transaction = new Transaction(event.transaction.hash.toHexString());

    transaction.orderPrice = unitPrice;
    transaction.taker = getOrInitUser(event.params.maker).id;
    transaction.currency = event.params.ccy;
    transaction.maturity = event.params.maturity;
    transaction.side = event.params.side;

    transaction.forwardValue = event.params.filledFutureValue;
    transaction.amount = event.params.filledAmount;

    transaction.averagePrice = !event.params.filledFutureValue.isZero()
        ? event.params.filledAmount.divDecimal(
              new BigDecimal(event.params.filledFutureValue)
          )
        : BigDecimal.zero();

    transaction.createdAt = event.block.timestamp;
    transaction.blockNumber = event.block.number;
    transaction.txHash = event.transaction.hash;

    transaction.lendingMarket = getOrInitLendingMarket(
        transaction.currency,
        transaction.maturity
    ).id;

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
