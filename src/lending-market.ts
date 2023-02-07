import { BigDecimal } from '@graphprotocol/graph-ts';
import { LendingMarket, Order, Transaction } from '../generated/schema';
import {
    CancelOrder,
    CleanOrders,
    MakeOrder,
    TakeOrders,
} from '../generated/templates/LendingMarket/LendingMarket';
import { getOrInitUser } from './helper/initializer';
import { buildLendingMarketId } from './utils/string';

export function handleMakeOrder(event: MakeOrder): void {
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

export function handleTakeOrders(event: TakeOrders): void {
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

    const lendingMarketId = buildLendingMarketId(
        transaction.currency,
        transaction.maturity
    );

    const lendingMarket = LendingMarket.load(lendingMarketId);
    if (lendingMarket) {
        transaction.lendingMarket = lendingMarket.id;
        lendingMarket.transactions = lendingMarket.transactions.concat([
            transaction.id,
        ]);
        lendingMarket.save();
    } else {
        throw new Error(`Lending market not found: ${lendingMarketId}}`);
    }

    transaction.save();
}

export function handleCancelOrder(event: CancelOrder): void {
    const id = event.params.orderId;
    let order = Order.load(id.toHexString());
    if (order === null) {
        order = new Order(id.toHexString());
    }

    order.status = 'Cancelled';
    order.save();
}

export function handleCleanOrders(event: CleanOrders): void {
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
