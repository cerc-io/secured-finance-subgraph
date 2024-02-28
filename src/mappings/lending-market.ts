import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { DailyVolume, Order, Transaction } from '../../generated/schema';
import {
    OrderCanceled,
    OrderExecuted,
    OrdersCleaned,
    PositionUnwound,
    PreOrderExecuted,
} from '../../generated/templates/OrderActionLogic/OrderActionLogic';
import { ItayoseExecuted } from '../../generated/templates/OrderBookLogic/OrderBookLogic';
import {
    getOrInitDailyVolume,
    getOrInitLendingMarket,
    initOrder,
    initTransaction,
} from '../helper/initializer';
import { getOrderEntityId } from '../utils/id-generation';

export function handleOrderExecuted(event: OrderExecuted): void {
    let orderId = getOrderEntityId(
        event.params.placedOrderId,
        event.params.ccy,
        event.params.maturity
    );
    let status: string;
    let type: string;
    if (event.params.inputUnitPrice.isZero()) {
        type = 'Market';
    } else {
        type = 'Limit';
    }

    if (event.params.filledAmount.equals(event.params.inputAmount)) {
        status = 'Filled';
    } else if (
        event.params.inputAmount.equals(
            event.params.filledAmount.plus(event.params.placedAmount)
        )
    ) {
        if (event.params.filledAmount.isZero()) {
            status = 'Open';
        } else {
            status = 'PartiallyFilled';
        }
    } else {
        // set status to Killed for circuit breaker and partially filled Market orders
        status = 'Killed';
    }

    if (event.params.placedOrderId.isZero()) {
        orderId = orderId + ':' + event.transaction.hash.toHexString();
    }

    initOrder(
        orderId,
        event.params.placedOrderId,
        event.params.user,
        event.params.ccy,
        event.params.side,
        event.params.maturity,
        event.params.inputUnitPrice,
        event.params.inputAmount,
        event.params.filledAmount,
        status,
        false,
        type,
        event.params.isCircuitBreakerTriggered,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash
    );

    if (!event.params.filledAmount.isZero()) {
        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        initTransaction(
            txId,
            orderId,
            event.params.filledUnitPrice,
            event.params.user,
            event.params.ccy,
            event.params.maturity,
            event.params.side,
            event.params.filledAmount,
            event.params.filledAmountInFV,
            event.params.feeInFV,
            'Taker',
            event.block.timestamp,
            event.block.number,
            event.transaction.hash
        );
        const dailyVolume = getOrInitDailyVolume(
            event.params.ccy,
            event.params.maturity,
            event.block.timestamp
        );
        addToTransactionVolume(event.params.filledAmount, dailyVolume);
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
        event.params.amount,
        BigInt.fromI32(0),
        'Open',
        true,
        'Limit',
        false,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash
    );
}

export function handlePositionUnwound(event: PositionUnwound): void {
    const orderId =
        getOrderEntityId(
            BigInt.fromI32(0),
            event.params.ccy,
            event.params.maturity
        ) +
        ':' +
        event.transaction.hash.toHexString();
    let status: string;
    if (
        event.params.isCircuitBreakerTriggered ||
        !event.params.filledAmountInFV.equals(event.params.inputFutureValue)
    ) {
        status = 'Killed';
    } else if (
        event.params.filledAmountInFV.equals(event.params.inputFutureValue)
    ) {
        status = 'Filled';
    } else {
        return;
    }

    initOrder(
        orderId,
        BigInt.fromI32(0),
        event.params.user,
        event.params.ccy,
        event.params.side,
        event.params.maturity,
        BigInt.fromI32(0),
        event.params.inputFutureValue,
        event.params.filledAmountInFV,
        status,
        false,
        'Unwind',
        event.params.isCircuitBreakerTriggered,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash
    );
    if (!event.params.filledAmount.isZero()) {
        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        initTransaction(
            txId,
            orderId,
            event.params.filledUnitPrice,
            event.params.user,
            event.params.ccy,
            event.params.maturity,
            event.params.side,
            event.params.filledAmount,
            event.params.filledAmountInFV,
            event.params.feeInFV,
            'Taker',
            event.block.timestamp,
            event.block.number,
            event.transaction.hash
        );
        const dailyVolume = getOrInitDailyVolume(
            event.params.ccy,
            event.params.maturity,
            event.block.timestamp
        );
        addToTransactionVolume(event.params.filledAmount, dailyVolume);
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
        order.statusUpdatedAt = event.block.timestamp;
        order.save();
    }
}

export function handleOrdersCleaned(event: OrdersCleaned): void {
    for (let i = 0; i < event.params.orderIds.length; i++) {
        const orderId = getOrderEntityId(
            event.params.orderIds[i],
            event.params.ccy,
            event.params.maturity
        );
        const order = Order.load(orderId);

        if (order) {
            const txId =
                event.transaction.hash.toHexString() +
                '-' +
                i.toString() +
                ':' +
                event.logIndex.toString();
            let unitPrice = order.inputUnitPrice;
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
                orderId,
                unitPrice,
                Address.fromString(order.user),
                order.currency,
                order.maturity,
                order.side,
                order.inputAmount.minus(order.filledAmount),
                calculateForwardValue(
                    order.inputAmount.minus(order.filledAmount),
                    unitPrice
                ),
                BigInt.fromI32(0),
                'Maker',
                event.block.timestamp,
                event.block.number,
                event.transaction.hash
            );
            order.filledAmount = order.inputAmount;
            order.status = 'Filled';
            order.statusUpdatedAt = event.block.timestamp;
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

    const dailyVolume = getOrInitDailyVolume(
        event.params.ccy,
        event.params.maturity,
        event.block.timestamp
    );
    addToTransactionVolume(event.params.offsetAmount, dailyVolume);
}

function addToTransactionVolume(
    amount: BigInt,
    dailyVolume: DailyVolume
): void {
    dailyVolume.volume = dailyVolume.volume.plus(amount);
    dailyVolume.save();
}

function calculateForwardValue(amount: BigInt, unitPrice: BigInt): BigInt {
    return amount.times(BigInt.fromI32(10000)).div(unitPrice);
}
