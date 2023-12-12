import { BigInt } from '@graphprotocol/graph-ts';
import { OrderPartiallyFilled } from '../generated/FundManagementLogic/LendingMarketController';
import { Order } from '../generated/schema';
import { initTransaction } from './helper/initializer';
import { getOrderEntityId } from './utils/id-generation';

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
        order.statusUpdatedAt = event.block.timestamp;
        order.save();

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        initTransaction(
            txId,
            order.inputUnitPrice,
            event.params.maker,
            event.params.ccy,
            event.params.maturity,
            event.params.side,
            event.params.amount,
            event.params.amountInFV,
            BigInt.fromI32(0),
            'Lazy',
            event.block.timestamp,
            event.block.number,
            event.transaction.hash
        );
    }
}
