import { BigInt } from '@graphprotocol/graph-ts';
import {
    afterEach,
    assert,
    beforeEach,
    clearStore,
    describe,
    test,
} from 'matchstick-as/assembly/index';
import { getProtocol } from '../src/helper/initializer';
import {
    handleOrderBookCreated,
    handleOrderBooksRotated,
} from '../src/mappings/lending-controller';
import { buildLendingMarketId, toBytes32 } from '../src/utils/string';
import {
    createOrderBookCreatedEvent,
    createOrderBooksRotatedEvent,
    toArrayString,
} from './mocks';

const orderBookId = BigInt.fromI32(1);
const openingDate = BigInt.fromI32(12345);
const preOpeningDate = BigInt.fromI32(1234);
const maturity = BigInt.fromI32(1677628800);

afterEach(() => {
    clearStore();
});

const filBytes = toBytes32('FIL');
const ethBytes = toBytes32('ETH');

const openingDateList = [
    BigInt.fromI32(1659852800),
    BigInt.fromI32(1667628800),
    BigInt.fromI32(1675577600),
    BigInt.fromI32(1683526400),
];

const maturityList = [
    BigInt.fromI32(1669852800),
    BigInt.fromI32(1677628800),
    BigInt.fromI32(1685577600),
    BigInt.fromI32(1693526400),
];

const newMaturity = BigInt.fromI32(1701388800);

const LENDING_MARKET_ENTITY_NAME = 'LendingMarket';
const PROTOCOL = 'Protocol';

describe('With no lending markets existing', () => {
    test('Creating a new lending market should create the entity', () => {
        const event = createOrderBookCreatedEvent(
            ethBytes,
            orderBookId,
            openingDate,
            preOpeningDate,
            maturity
        );
        handleOrderBookCreated(event);

        const id = buildLendingMarketId(ethBytes, maturity);
        assert.fieldEquals(
            LENDING_MARKET_ENTITY_NAME,
            id,
            'currency',
            ethBytes.toHexString()
        );
        assert.fieldEquals(
            LENDING_MARKET_ENTITY_NAME,
            id,
            'maturity',
            maturity.toString()
        );
        assert.fieldEquals(LENDING_MARKET_ENTITY_NAME, id, 'isActive', 'true');
        assert.fieldEquals(
            LENDING_MARKET_ENTITY_NAME,
            id,
            'prettyName',
            'ETH-MAR2023'
        );
    });

    test('Creating a new lending market should add it to the protocol', () => {
        const event = createOrderBookCreatedEvent(
            ethBytes,
            orderBookId,
            openingDate,
            preOpeningDate,
            maturity
        );
        handleOrderBookCreated(event);

        assert.entityCount(PROTOCOL, 1);
        const protocol = getProtocol();
        assert.bigIntEquals(protocol.totalUsers, BigInt.fromI32(0));
        const lendingMarkets = protocol.lendingMarkets.load();
        assert.i32Equals(lendingMarkets.length, 1);
        assert.stringEquals(
            lendingMarkets[0].id,
            buildLendingMarketId(ethBytes, maturity)
        );
    });
});

describe('With lending markets already existing', () => {
    beforeEach(() => {
        for (let i = 0; i < openingDateList.length; i++) {
            const openingDate = openingDateList[i];
            const maturity = maturityList[i];
            handleOrderBookCreated(
                createOrderBookCreatedEvent(
                    filBytes,
                    BigInt.fromI32(i + 1),
                    openingDate,
                    preOpeningDate,
                    maturity
                )
            );
            handleOrderBookCreated(
                createOrderBookCreatedEvent(
                    ethBytes,
                    BigInt.fromI32(i + 1),
                    openingDate,
                    preOpeningDate,
                    maturity
                )
            );
        }
    });

    test('Rotate lending market should create the new Lending Market', () => {
        const event = createOrderBooksRotatedEvent(
            filBytes,
            maturityList[0],
            newMaturity
        );

        handleOrderBooksRotated(event);

        const id = buildLendingMarketId(filBytes, newMaturity);
        assert.fieldEquals(LENDING_MARKET_ENTITY_NAME, id, 'isActive', 'true');
        assert.fieldEquals(
            LENDING_MARKET_ENTITY_NAME,
            id,
            'currency',
            filBytes.toHexString()
        );
        assert.fieldEquals(
            LENDING_MARKET_ENTITY_NAME,
            id,
            'maturity',
            newMaturity.toString()
        );
        assert.fieldEquals(
            LENDING_MARKET_ENTITY_NAME,
            id,
            'protocol',
            'ethereum'
        );
    });

    test('Rotate lending market should add the new maturity market to the protocol', () => {
        const event = createOrderBooksRotatedEvent(
            filBytes,
            maturityList[0],
            newMaturity
        );

        handleOrderBooksRotated(event);

        const protocol = getProtocol();
        const lendingMarkets = protocol.lendingMarkets.load();
        assert.i32Equals(lendingMarkets.length, 9);
    });
});
