import { Bytes, log } from '@graphprotocol/graph-ts';
import {
    LendingMarketCreated,
    LendingMarketsRotated,
} from '../generated/LendingMarketController/LendingMarketController';
import { LendingMarket, Transaction, Order } from '../generated/schema';
import { LendingMarket as LendingMarketTemplate } from '../generated/templates';
import { getOrInitLendingMarket, getProtocol } from './helper/initializer';

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
    updateTransactions(rollingOutMarket);

    setOrdersAsExpired(rollingOutMarket);
}

const getMarketList = (ccy: Bytes): LendingMarket[] => {
    const markets = getProtocol().lendingMarkets;
    if (markets.length > 0) {
        const marketList: LendingMarket[] = [];
        for (let i = 0; i < markets.length; i++) {
            const market = LendingMarket.load(markets[i]);
            if (market && market.currency == ccy && market.isActive) {
                marketList.push(market);
            }
        }
        return marketList;
    }
    return [];
};

const getShortestMaturityActiveMarket = (ccy: Bytes): LendingMarket | null => {
    const marketList = getMarketList(ccy);
    let market: LendingMarket | null = null;
    if (marketList && marketList.length > 0) {
        for (let i = 0; i < marketList.length; i++) {
            if (!market) {
                market = marketList[i];
            }

            if (marketList[i].maturity.lt(market.maturity)) {
                market = marketList[i];
            }
        }
    }
    return market;
};

const rollOutMarket = (market: LendingMarket): void => {
    market.isActive = false;
    market.save();
};

const updateTransactions = (rolledOutMarket: LendingMarket): void => {
    if (!rolledOutMarket.isSet('transactions')) {
        log.debug('No transactions found for market {}', [
            rolledOutMarket.prettyName,
        ]);
        return;
    }
    const transactions = rolledOutMarket.transactions;

    if (!transactions) {
        return;
    }

    log.debug('Rolling {} Transactions', [transactions.length.toString()]);

    const closestMarket = getShortestMaturityActiveMarket(
        rolledOutMarket.currency
    );

    if (!closestMarket) {
        throw new Error('No closest market found');
    }

    for (let i = 0; i < transactions.length; i++) {
        const transaction = Transaction.load(transactions[i]);
        if (!transaction) {
            continue;
        }

        transaction.maturity = closestMarket.maturity;
        transaction.lendingMarket = closestMarket.id;
        transaction.save();
    }
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

        if (order && (order.status == 'Open' || order.status == 'PartiallyFilled')) {
            order.status = 'Expired';
            order.save();
        }
    }
};
