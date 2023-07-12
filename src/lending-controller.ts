import { log } from '@graphprotocol/graph-ts';
import {
    LendingMarketCreated,
    LendingMarketsRotated,
} from '../generated/LendingMarketOperationLogic/LendingMarketController';
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

    rollingOutMarket.isActive = false;
    rollingOutMarket.save();
}
