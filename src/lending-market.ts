import {
    Address,
    BigDecimal,
    BigInt,
    Bytes,
    log,
} from '@graphprotocol/graph-ts';
import { Order, Transaction } from '../generated/schema';
import {
    OrderCanceled,
    OrderMade,
    OrderPartiallyTaken,
    OrdersCleaned,
    OrdersTaken,
} from '../generated/templates/LendingMarket/LendingMarket';
import {
    getOrInitDailyVolume,
    getOrInitLendingMarket,
    getOrInitUser,
} from './helper/initializer';
import { getOrderEntityId } from './utils/id-generation';

export function handleOrderMade(event: OrderMade): void {
    const id = getOrderEntityId(
        event.params.orderId,
        event.params.ccy,
        event.params.maturity
    );
    const user = getOrInitUser(event.params.maker);

    const order = new Order(id);
    order.status = 'Open';
    order.orderId = event.params.orderId;
    order.filledAmount = BigInt.fromI32(0);
    order.amount = event.params.amount;
    order.maker = user.id;
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

    user.noOfOrders = user.noOfOrders.plus(BigInt.fromI32(1));
    user.save();
}

export function handleOrdersTaken(event: OrdersTaken): void {
    const txId =
        event.transaction.hash.toHexString() + ':' + event.logIndex.toString();
    createTransaction(
        txId,
        event.params.unitPrice,
        event.params.taker,
        event.params.ccy,
        event.params.maturity,
        event.params.side,
        event.params.filledAmount,
        event.params.filledFutureValue,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        'Sync'
    );
    addToTransactionVolume(event);
}

export function handleOrderCanceled(event: OrderCanceled): void {
    const id = getOrderEntityId(
        event.params.orderId,
        event.params.ccy,
        event.params.maturity
    );
    const order = Order.load(id);
    if (order) {
        order.status = 'Cancelled';
        order.save();
    }
}

export function handleOrdersCleaned(event: OrdersCleaned): void {
    for (let i = 0; i < event.params.orderIds.length; i++) {
        const id = getOrderEntityId(
            event.params.orderIds[i],
            event.params.ccy,
            event.params.maturity
        );
        const order = Order.load(id);

        if (order) {
            const txId =
                event.transaction.hash.toHexString() +
                '-' +
                i.toString() +
                ':' +
                event.logIndex.toString();
            createTransaction(
                txId,
                order.unitPrice,
                Address.fromString(order.maker),
                order.currency,
                order.maturity,
                order.side,
                order.amount.minus(order.filledAmount),
                calculateForwardValue(
                    order.amount.minus(order.filledAmount),
                    order.unitPrice
                ),
                event.block.timestamp,
                event.block.number,
                event.transaction.hash,
                'Lazy'
            );
            order.filledAmount = order.amount;
            order.status = 'Filled';
            order.save();
        }
    }
}

export function handleOrderPartiallyTaken(event: OrderPartiallyTaken): void {
    const id = getOrderEntityId(
        event.params.orderId,
        event.params.ccy,
        event.params.maturity
    );
    const order = Order.load(id);
    if (order) {
        order.filledAmount = order.filledAmount.plus(event.params.filledAmount);
        order.status = 'PartiallyFilled';
        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        createTransaction(
            txId,
            order.unitPrice,
            event.params.maker,
            event.params.ccy,
            event.params.maturity,
            event.params.side,
            event.params.filledAmount,
            event.params.filledFutureValue,
            event.block.timestamp,
            event.block.number,
            event.transaction.hash,
            'Sync'
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
    txHash: Bytes,
    executionType: string
): void {
    if (filledAmount.isZero()) return;
    const transaction = new Transaction(txId);
    const user = getOrInitUser(taker);

    transaction.orderPrice = unitPrice;
    transaction.taker = user.id;
    transaction.currency = ccy;
    transaction.maturity = maturity;
    transaction.side = side;
    transaction.executionType = executionType;

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

    user.noOfTransactions = user.noOfTransactions.plus(BigInt.fromI32(1));
    user.save();
}

function addToTransactionVolume(event: OrdersTaken): void {
    // We expect to have a transaction entity created in the handleOrdersTaken
    const txId =
        event.transaction.hash.toHexString() + ':' + event.logIndex.toString();
    const transaction = Transaction.load(txId);
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
    return (amount * BigInt.fromI32(10000)).div(unitPrice);
}
