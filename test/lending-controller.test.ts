import { Address, BigInt } from '@graphprotocol/graph-ts';
import {
    afterEach,
    assert,
    beforeEach,
    clearStore,
    describe,
    test,
} from 'matchstick-as/assembly/index';
import { PROTOCOL_ID, getProtocol } from '../src/helper/initializer';
import {
    handleLendingMarketCreated,
    handleLendingMarketsRotated,
} from '../src/lending-controller';
import {
    handleOrderCanceled,
    handleOrderMade,
    handleOrderPartiallyTaken,
} from '../src/lending-market';

import { buildLendingMarketId, toBytes32 } from '../src/utils/string';
import {
    createLendingMarketCreatedEvent,
    createLendingMarketsRotatedEvent,
    createOrderCanceledEvent,
    createOrderMadeEvent,
    createOrderPartiallyTakenEvent,
    toArrayString,
} from './mocks';
import { ALICE, BOB, createTransaction } from './utils/createEntities';
import { getOrderEntityId } from '../src/utils/id-generation';

const lendingMarketAddress = Address.zero();
const futureValueVault = Address.zero();
const index = BigInt.fromI32(0);
const openingDate = BigInt.fromI32(1);
const maturity = BigInt.fromI32(365);

const maker = Address.zero();
const side = BigInt.fromI32(0).toI32();
const ccy = toBytes32('ETH');
const amount = BigInt.fromI32(100);
const unitPrice = BigInt.fromI32(9000);

afterEach(() => {
    clearStore();
});

const fil = 'FIL';
const filBytes = toBytes32(fil);
const ethBytes = toBytes32('ETH');

const addressList = [
    Address.fromString('0x0000000000000000000000000000000000000000'), // Dec 22
    Address.fromString('0x0000000000000000000000000000000000000001'), // Mar 23
    Address.fromString('0x0000000000000000000000000000000000000010'), // Jun 23
    Address.fromString('0x0000000000000000000000000000000000000100'), // Sep 23
];

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
const newAddress = Address.fromString(
    '0x0000000000000000000000000000000000001000'
);

const LENDING_MARKET_ENTITY_NAME = 'LendingMarket';
const PROTOCOL = 'Protocol';

const TOTAL_NUMBER_PREPOPULATED_MARKET = 8;
const assertLendingMarketCreated = (): void => {
    assert.entityCount(
        LENDING_MARKET_ENTITY_NAME,
        TOTAL_NUMBER_PREPOPULATED_MARKET + 1
    );
};

describe('With no lending markets existing', () => {
    test('Creating a new lending market should create the entity', () => {
        const event = createLendingMarketCreatedEvent(
            ethBytes,
            lendingMarketAddress,
            futureValueVault,
            index,
            openingDate,
            maturity
        );
        handleLendingMarketCreated(event);

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
    });

    test('Creating a new lending market should add it to the protocol', () => {
        const event = createLendingMarketCreatedEvent(
            ethBytes,
            lendingMarketAddress,
            futureValueVault,
            index,
            openingDate,
            maturity
        );
        handleLendingMarketCreated(event);

        assert.entityCount(PROTOCOL, 1);
        assert.fieldEquals(
            PROTOCOL,
            PROTOCOL_ID,
            'lendingMarkets',
            toArrayString([buildLendingMarketId(ethBytes, maturity)])
        );
    });
});

describe('With lending markets already existing', () => {
    beforeEach(() => {
        for (let i = 0; i < addressList.length; i++) {
            const address = addressList[i];
            const openingDate = openingDateList[i];
            const maturity = maturityList[i];
            handleLendingMarketCreated(
                createLendingMarketCreatedEvent(
                    filBytes,
                    address,
                    address,
                    BigInt.fromI32(i),
                    openingDate,
                    maturity
                )
            );
            handleLendingMarketCreated(
                createLendingMarketCreatedEvent(
                    ethBytes,
                    address,
                    address,
                    BigInt.fromI32(i),
                    openingDate,
                    maturity
                )
            );
        }
    });

    test('Rotate lending market should create the new Lending Market', () => {
        const event = createLendingMarketsRotatedEvent(
            filBytes,
            maturityList[0],
            newMaturity
        );

        handleLendingMarketsRotated(event);

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
    });

    test('Rotate lending market should add the new maturity market to the protocol', () => {
        const event = createLendingMarketsRotatedEvent(
            filBytes,
            maturityList[0],
            newMaturity
        );

        handleLendingMarketsRotated(event);

        const protocol = getProtocol();
        const lendingMarkets = protocol.lendingMarkets;
        assert.i32Equals(lendingMarkets.length, 9);
    });

    test('Rolling out a lending market with existing transactions should update those transactions', () => {
        const event = createLendingMarketsRotatedEvent(
            filBytes,
            maturityList[0],
            newMaturity
        );

        const hashList = [
            Address.fromString('0x0000000000000000000000000000000000000000'),
            Address.fromString('0x0000000000000000000000000000000000000001'),
            Address.fromString('0x0000000000000000000000000000000000000002'),
            Address.fromString('0x0000000000000000000000000000000000000003'),
        ];

        createTransaction(
            ALICE,
            0,
            filBytes,
            maturityList[0],
            BigInt.fromI32(100000),
            BigInt.fromI32(9000),
            BigInt.fromI32(100002),
            hashList[0]
        );
        createTransaction(
            BOB,
            0,
            filBytes,
            maturityList[0],
            BigInt.fromI32(100000),
            BigInt.fromI32(9000),
            BigInt.fromI32(100002),
            hashList[1]
        );
        createTransaction(
            ALICE,
            0,
            toBytes32('ETH'),
            maturityList[0],
            BigInt.fromI32(100000),
            BigInt.fromI32(9000),
            BigInt.fromI32(100002),
            hashList[2]
        );
        createTransaction(
            BOB,
            0,
            filBytes,
            maturityList[1],
            BigInt.fromI32(100000),
            BigInt.fromI32(9000),
            BigInt.fromI32(100002),
            hashList[3]
        );
        assert.entityCount('Transaction', 4);

        handleLendingMarketsRotated(event);

        // Maturity of only the FIL transactions with maturity Dec 22 should be updated
        // Transaction 0 is updated (FIL, Dec 22)
        assert.fieldEquals(
            'Transaction',
            hashList[0].toHexString() + ':1',
            'maturity',
            maturityList[1].toString()
        );

        // Transaction 1 is updated (FIL, Dec 22)
        assert.fieldEquals(
            'Transaction',
            hashList[1].toHexString() + ':1',
            'maturity',
            maturityList[1].toString()
        );

        // Transaction 2 is not updated (ETH, Dec 22)
        assert.fieldEquals(
            'Transaction',
            hashList[2].toHexString() + ':1',
            'maturity',
            maturityList[0].toString()
        );

        // Transaction 3 is not updated (FIL, Mar 23)
        assert.fieldEquals(
            'Transaction',
            hashList[3].toHexString() + ':1',
            'maturity',
            maturityList[1].toString()
        );
    });

    test('Rolling out a market should change the status of open orders with oldMaturity to expired', () => {
        const orderId = BigInt.fromI32(1);
        const id = getOrderEntityId(orderId, ccy, maturityList[0]);

        handleOrderMade(
            createOrderMadeEvent(
                orderId,
                maker,
                side,
                ccy,
                maturityList[0],
                amount,
                unitPrice
            )
        );

        const orderId2 = BigInt.fromI32(2);
        const id2 = getOrderEntityId(orderId2, ccy, maturityList[2]);

        handleOrderMade(
            createOrderMadeEvent(
                orderId2,
                maker,
                side,
                ccy,
                maturityList[2],
                amount,
                unitPrice
            )
        );

        const orderId3 = BigInt.fromI32(3);
        const id3 = getOrderEntityId(orderId3, ccy, maturityList[0]);

        handleOrderMade(
            createOrderMadeEvent(
                orderId3,
                maker,
                side,
                ccy,
                maturityList[0],
                amount,
                unitPrice
            )
        );
        const event = createLendingMarketsRotatedEvent(
            ccy,
            maturityList[0],
            newMaturity
        );

        handleLendingMarketsRotated(event);

        assert.fieldEquals('Order', id, 'status', 'Expired');
        assert.fieldEquals('Order', id2, 'status', 'Open');
        assert.fieldEquals('Order', id3, 'status', 'Expired');
    });

    test('Rolling out a market should not change the status of cancelled orders to expired', () => {
        const orderId = BigInt.fromI32(1);
        const id = getOrderEntityId(orderId, ccy, maturityList[0]);

        handleOrderMade(
            createOrderMadeEvent(
                orderId,
                maker,
                side,
                ccy,
                maturityList[0],
                amount,
                unitPrice
            )
        );

        handleOrderCanceled(
            createOrderCanceledEvent(
                orderId,
                maker,
                side,
                ccy,
                maturityList[0],
                amount,
                unitPrice
            )
        );
        assert.fieldEquals('Order', id, 'status', 'Cancelled');
        const event = createLendingMarketsRotatedEvent(
            ccy,
            maturityList[0],
            newMaturity
        );

        handleLendingMarketsRotated(event);

        assert.fieldEquals('Order', id, 'status', 'Cancelled');
    });

    test('Rolling out a market should change the status of partially filled orders to expired', () => {
        const orderId = BigInt.fromI32(1);
        const id = getOrderEntityId(orderId, ccy, maturityList[0]);

        handleOrderMade(
            createOrderMadeEvent(
                orderId,
                maker,
                side,
                ccy,
                maturityList[0],
                amount,
                unitPrice
            )
        );

        handleOrderPartiallyTaken(
            createOrderPartiallyTakenEvent(
                orderId,
                maker,
                side,
                ccy,
                maturityList[0],
                BigInt.fromI32(90),
                BigInt.fromI32(100)
            )
        );
        assert.fieldEquals('Order', id, 'status', 'PartiallyFilled');
        const event = createLendingMarketsRotatedEvent(
            ccy,
            maturityList[0],
            newMaturity
        );

        handleLendingMarketsRotated(event);

        assert.fieldEquals('Order', id, 'status', 'Expired');
    });
});
