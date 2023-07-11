import {
    Address,
    BigDecimal,
    BigInt,
    Bytes,
    log,
} from '@graphprotocol/graph-ts';
import { Order, Transaction } from '../generated/schema';
import { OrderPartiallyFilled } from '../generated/FundManagement/FundManagement';
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
        order.save();

        const txId =
            event.transaction.hash.toHexString() +
            ':' +
            event.logIndex.toString();
        initTransaction(
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
