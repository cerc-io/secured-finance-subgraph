import { log } from '@graphprotocol/graph-ts';
import {
    LendingMarketCreated,
    LendingMarketsRotated,
} from '../generated/LendingMarketController/LendingMarketController';
import { LendingMarket, Order } from '../generated/schema';
import { LendingMarket as LendingMarketTemplate } from '../generated/templates';
import { getOrInitLendingMarket } from './helper/initializer';

export function handleLendingMarketCreated(event: LendingMarketCreated): void {
    LendingMarketTemplate.create(event.params.marketAddr);
    getOrInitLendingMarket(event.params.ccy, event.params.maturity);
}

// Load all transactions for the rolling market, and change their maturity to the closest one
export function handleLendingMarketsRotated(
    event: LendingMarketsRotated
): void {
    // Create the new market if it doesn't exist
    getOrInitLendingMarket(event.params.ccy, event.params.newMaturity);

    const rollingOutMarket = getOrInitLendingMarket(
        event.params.ccy,
        event.params.oldMaturity
    );

    rollOutMarket(rollingOutMarket);
    setOrdersAsExpired(rollingOutMarket);
}

const rollOutMarket = (market: LendingMarket): void => {
    market.isActive = false;
    market.save();
};

const setOrdersAsExpired = (rolledOutMarket: LendingMarket): void => {
    if (!rolledOutMarket.isSet('orders')) {
        log.debug('No orders found for market {}', [
            rolledOutMarket.prettyName,
        ]);
        return;
    }

    const orders = rolledOutMarket.orders;

    if (!orders) {
        return;
    }
    log.debug('Rolling {} Orders', [orders.length.toString()]);

    for (let i = 0; i < orders.length; i++) {
        const order = Order.load(orders[i]);

        if (
            order &&
            (order.status == 'Open' || order.status == 'PartiallyFilled')
        ) {
            order.status = 'Expired';
            order.save();
        }
    }
};
