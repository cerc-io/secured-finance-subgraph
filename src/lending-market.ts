import {
    Address,
    BigDecimal,
    BigInt,
    Bytes,
    log,
} from '@graphprotocol/graph-ts';
import { Order, Transaction, DailyVolume } from '../generated/schema';
import {
    OrderExecuted,
    PreOrderExecuted,
    PositionUnwound,
    OrderCanceled,
    OrdersCleaned,
    ItayoseExecuted,
} from '../generated/templates/LendingMarket/LendingMarket';
import { OrderPartiallyFilled } from '../generated/FundManagementLogic/FundManagementLogic';
import {
    getOrInitDailyVolume,
    getOrInitLendingMarket,
    getOrInitUser,
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
        id = id + ':' + event.transaction.hash.toString();
        if (!event.params.filledAmount.isZero()) {
            amount = event.params.filledAmount;
            unitPrice = event.params.filledUnitPrice;
            status = 'Filled';
        } else {
            return;
        }
    } else if (!event.params.placedAmount.isZero()) {
        amount = event.params.inputAmount;
        unitPrice = event.params.inputUnitPrice;
        if (!event.params.filledAmount.isZero()) {
            status = 'PartiallyFilled';
        } else {
            status = 'Open';
        }
    } else if (!event.params.filledAmount.isZero()) {
        id = id + ':' + event.transaction.hash.toString();
        if (
            event.params.inputAmount.minus(event.params.filledAmount).isZero()
        ) {
            amount = event.params.inputAmount;
            unitPrice = event.params.inputUnitPrice;
            status = 'Filled';
        } else {
            amount = event.params.inputAmount;
            unitPrice = event.params.inputUnitPrice;
            status = 'PartiallyBlocked';
        }
    } else {
        id = id + ':' + event.transaction.hash.toString();
        amount = event.params.inputAmount;
        unitPrice = event.params.inputUnitPrice;
        status = 'Blocked';
    }
    createOrder(
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
        createTransaction(
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
    createOrder(
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
        event.transaction.hash.toString();
    createOrder(
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
        event.transaction.hash.toHexString() + ':' + event.logIndex.toString();
    createTransaction(
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

export function handleOrderPartiallyFilled(event: OrderPartiallyFilled): void {
    const id = getOrderEntityId(
        event.params.orderId,
        event.params.ccy,
        event.params.maturity
    );
    const order = Order.load(id);
    if (order) {
        order.filledAmount = order.filledAmount.plus(event.params.amount);
        order.status = 'PartiallyFilled';
        order.save();

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
            event.params.amount,
            event.params.futureValue,
            'Lazy',
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
            createTransaction(
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

function createOrder(
    id: string,
    orderId: BigInt,
    maker: Address,
    currency: Bytes,
    side: i32,
    maturity: BigInt,
    unitPrice: BigInt,
    filledAmount: BigInt,
    amount: BigInt,
    status: string,
    isPreOrder: boolean,
    createdAt: BigInt,
    blockNumber: BigInt,
    txHash: Bytes
): void {
    if (amount.isZero()) return;

    const order = new Order(id);
    const user = getOrInitUser(maker);

    order.orderId = orderId;
    order.maker = user.id;
    order.currency = currency;
    order.side = side;
    order.maturity = maturity;
    order.unitPrice = unitPrice;
    order.filledAmount = filledAmount;
    order.amount = amount;
    order.status = status;
    order.lendingMarket = getOrInitLendingMarket(currency, maturity).id;
    order.isPreOrder = isPreOrder;
    order.createdAt = createdAt;
    order.blockNumber = blockNumber;
    order.txHash = txHash;
    order.save();

    user.orderCount = user.orderCount.plus(BigInt.fromI32(1));
    user.save();
}

function createTransaction(
    txId: string,
    unitPrice: BigInt,
    taker: Address,
    currency: Bytes,
    maturity: BigInt,
    side: i32,
    filledAmount: BigInt,
    filledFutureValue: BigInt,
    executionType: string,
    timestamp: BigInt,
    blockNumber: BigInt,
    txHash: Bytes
): void {
    if (filledAmount.isZero()) return;

    const transaction = new Transaction(txId);
    const user = getOrInitUser(taker);

    transaction.orderPrice = unitPrice;
    transaction.taker = user.id;
    transaction.currency = currency;
    transaction.maturity = maturity;
    transaction.side = side;
    transaction.executionType = executionType;
    transaction.forwardValue = filledFutureValue;
    transaction.amount = filledAmount;
    transaction.averagePrice = !filledFutureValue.isZero()
        ? filledAmount.divDecimal(new BigDecimal(filledFutureValue))
        : BigDecimal.zero();
    transaction.lendingMarket = getOrInitLendingMarket(currency, maturity).id;
    transaction.createdAt = timestamp;
    transaction.blockNumber = blockNumber;
    transaction.txHash = txHash;
    transaction.save();

    user.transactionCount = user.transactionCount.plus(BigInt.fromI32(1));
    user.save();
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
    return (amount * BigInt.fromI32(10000)).div(unitPrice);
}
