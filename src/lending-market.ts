import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { DailyVolume, Order, Transaction } from '../generated/schema';
import {
    ItayoseExecuted,
    OrderCanceled,
    OrderExecuted,
    OrdersCleaned,
    PositionUnwound,
    PreOrderExecuted,
} from '../generated/templates/LendingMarket/LendingMarket';
import {
    getOrInitDailyVolume,
    getOrInitLendingMarket,
    initOrder,
    initTransaction,
} from './helper/initializer';
import { getOrderEntityId } from './utils/id-generation';

export function handleOrderExecuted(event: OrderExecuted): void {
    let id = getOrderEntityId(
        event.params.placedOrderId,
        event.params.ccy,
        event.params.maturity
    );
    let status: string;
    let amount: BigInt;
    let unitPrice: BigInt;
    if (event.params.inputUnitPrice.isZero()) {
        id = id + ':' + event.transaction.hash.toHexString();
        if (event.params.isCircuitBreakerTriggered) {
            if (event.params.filledAmount.isZero()) {
                amount = event.params.inputAmount;
                unitPrice = event.params.inputUnitPrice;
                status = 'Blocked';
            } else {
                amount = event.params.inputAmount;
                unitPrice = event.params.filledUnitPrice;
                status = 'PartiallyBlocked';
            }
        } else if (!event.params.filledAmount.isZero()) {
            amount = event.params.filledAmount;
            unitPrice = event.params.filledUnitPrice;
            status = 'Filled';
        } else {
            return;
        }
    } else {
        amount = event.params.inputAmount;
        unitPrice = event.params.inputUnitPrice;
        if (!event.params.placedAmount.isZero()) {
            if (!event.params.filledAmount.isZero()) {
                status = 'PartiallyFilled';
            } else {
                status = 'Open';
            }
        } else if (event.params.isCircuitBreakerTriggered) {
            id = id + ':' + event.transaction.hash.toHexString();
            if (event.params.filledAmount.isZero()) {
                status = 'Blocked';
            } else {
                status = 'PartiallyBlocked';
            }
        } else {
            id = id + ':' + event.transaction.hash.toHexString();
            status = 'Filled';
        }
    }
    initOrder(
        id,
        event.params.placedOrderId,
        event.params.user,
        event.params.ccy,
        event.params.side,
        event.params.maturity,
        unitPrice,
        event.params.filledAmount,
        amount,
        status,
        false,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash
    );

    if (
        status === 'PartiallyFilled' ||
        status === 'Filled' ||
        status === 'PartiallyBlocked'
    ) {
        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        initTransaction(
            txId,
            event.params.filledUnitPrice,
            event.params.user,
            event.params.ccy,
            event.params.maturity,
            event.params.side,
            event.params.filledAmount,
            event.params.filledFutureValue,
            'Sync',
            event.block.timestamp,
            event.block.number,
            event.transaction.hash
        );
        const dailyVolume = getOrInitDailyVolume(
            event.params.ccy,
            event.params.maturity,
            event.block.timestamp
        );
        addToTransactionVolume(txId, dailyVolume);
    }
}

export function handlePreOrderExecuted(event: PreOrderExecuted): void {
    const id = getOrderEntityId(
        event.params.orderId,
        event.params.ccy,
        event.params.maturity
    );
    initOrder(
        id,
        event.params.orderId,
        event.params.user,
        event.params.ccy,
        event.params.side,
        event.params.maturity,
        event.params.unitPrice,
        BigInt.fromI32(0),
        event.params.amount,
        'Open',
        true,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash
    );
}

export function handlePositionUnwound(event: PositionUnwound): void {
    const orderId = BigInt.fromI32(0);
    const id =
        getOrderEntityId(orderId, event.params.ccy, event.params.maturity) +
        ':' +
        event.transaction.hash.toHexString();
    if (!event.params.filledAmount.isZero()) {
        initOrder(
            id,
            orderId,
            event.params.user,
            event.params.ccy,
            event.params.side,
            event.params.maturity,
            event.params.filledUnitPrice,
            event.params.filledAmount,
            event.params.filledAmount,
            'Filled',
            false,
            event.block.timestamp,
            event.block.number,
            event.transaction.hash
        );
        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        initTransaction(
            txId,
            event.params.filledUnitPrice,
            event.params.user,
            event.params.ccy,
            event.params.maturity,
            event.params.side,
            event.params.filledAmount,
            event.params.filledFutureValue,
            'Sync',
            event.block.timestamp,
            event.block.number,
            event.transaction.hash
        );
        const dailyVolume = getOrInitDailyVolume(
            event.params.ccy,
            event.params.maturity,
            event.block.timestamp
        );
        addToTransactionVolume(txId, dailyVolume);
    } else if (event.params.isCircuitBreakerTriggered) {
        initOrder(
            id,
            orderId,
            event.params.user,
            event.params.ccy,
            event.params.side,
            event.params.maturity,
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            BigInt.fromI32(0),
            'Blocked',
            false,
            event.block.timestamp,
            event.block.number,
            event.transaction.hash
        );
    }
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
            let unitPrice = order.unitPrice;
            const lendingMarket = getOrInitLendingMarket(
                event.params.ccy,
                event.params.maturity
            );
            if (
                order.isPreOrder &&
                !lendingMarket.openingUnitPrice.isZero() &&
                ((order.side == 0 &&
                    unitPrice >= lendingMarket.lastLendUnitPrice) ||
                    (order.side == 1 &&
                        unitPrice <= lendingMarket.lastBorrowUnitPrice))
            ) {
                unitPrice = lendingMarket.openingUnitPrice;
            }
            initTransaction(
                txId,
                unitPrice,
                Address.fromString(order.maker),
                order.currency,
                order.maturity,
                order.side,
                order.amount.minus(order.filledAmount),
                calculateForwardValue(
                    order.amount.minus(order.filledAmount),
                    unitPrice
                ),
                'Lazy',
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

export function handleItayoseExecuted(event: ItayoseExecuted): void {
    const lendingMarket = getOrInitLendingMarket(
        event.params.ccy,
        event.params.maturity
    );
    lendingMarket.openingUnitPrice = event.params.openingUnitPrice;
    lendingMarket.lastLendUnitPrice = event.params.lastLendUnitPrice;
    lendingMarket.lastBorrowUnitPrice = event.params.lastBorrowUnitPrice;
    lendingMarket.offsetAmount = event.params.offsetAmount;
    lendingMarket.save();
}

function addToTransactionVolume(txId: string, dailyVolume: DailyVolume): void {
    const transaction = Transaction.load(txId);
    if (transaction) {
        dailyVolume.volume = dailyVolume.volume.plus(transaction.amount);
        dailyVolume.save();
    } else {
        log.error('Transaction entity not found: {}', [txId]);
    }
}

function calculateForwardValue(amount: BigInt, unitPrice: BigInt): BigInt {
    return amount.times(BigInt.fromI32(10000)).div(unitPrice);
}
