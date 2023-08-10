import {
    LendingMarketInitialized,
    OrderBookCreated,
    OrderBooksRotated,
} from '../generated/LendingMarketOperationLogic/LendingMarketController';
import { OrderActionLogic, OrderBookLogic } from '../generated/templates';
import { getOrInitLendingMarket } from './helper/initializer';

export function handleLendingMarketInitialized(
    event: LendingMarketInitialized
): void {
    OrderActionLogic.create(event.params.lendingMarket);
    OrderBookLogic.create(event.params.lendingMarket);
}

export function handleOrderBookCreated(event: OrderBookCreated): void {
    getOrInitLendingMarket(event.params.ccy, event.params.maturity);
}

// Load all transactions for the rolling market, and change their maturity to the closest one
export function handleOrderBooksRotated(event: OrderBooksRotated): void {
    // Create the new market if it doesn't exist
    getOrInitLendingMarket(event.params.ccy, event.params.newMaturity);

    const rollingOutMarket = getOrInitLendingMarket(
        event.params.ccy,
        event.params.oldMaturity
    );

    rollingOutMarket.isActive = false;
    rollingOutMarket.save();
}
