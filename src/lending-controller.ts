import { Bytes, log } from '@graphprotocol/graph-ts';
import {
    CreateLendingMarket,
    RotateLendingMarkets,
} from '../generated/LendingMarketController/LendingMarketController';
import { LendingMarket, Transaction } from '../generated/schema';
import { LendingMarket as LendingMarketTemplate } from '../generated/templates';
import { getOrInitLendingMarket, getProtocol } from './helper/initializer';

export function handleCreateLendingMarket(event: CreateLendingMarket): void {
    LendingMarketTemplate.create(event.params.marketAddr);
    getOrInitLendingMarket(
        event.params.ccy,
        event.params.maturity,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash
    );
}

// Load all transactions for the rolling market, and change their maturity to the closest one
export function handleRotateLendingMarkets(event: RotateLendingMarkets): void {
    // Create the new market if it doesn't exist
    getOrInitLendingMarket(
        event.params.ccy,
        event.params.newMaturity,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash
    );

    const rollingOutMarket = getOrInitLendingMarket(
        event.params.ccy,
        event.params.oldMaturity,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash
    );

    rollOutMarket(rollingOutMarket);
    updateTransactions(rollingOutMarket);
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
            if (market == null) {
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
    const transactions = rolledOutMarket.transactions;

    if (transactions == null) {
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
        if (transaction == null) {
            continue;
        }

        transaction.maturity = closestMarket.maturity;
        transaction.lendingMarket = closestMarket.id;
        transaction.save();
    }
};
