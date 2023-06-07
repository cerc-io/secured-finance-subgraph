import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts';
import {
    assert,
    beforeEach,
    clearStore,
    describe,
    test,
} from 'matchstick-as/assembly/index';
import {
    handleOrderCanceled,
    handleOrderMade,
    handleOrderPartiallyTaken,
    handleOrdersCleaned,
    handleOrdersTaken,
} from '../src/lending-market';
import { getDailyVolumeEntityId } from '../src/utils/id-generation';
import { toBytes32 } from '../src/utils/string';
import {
    createOrderCanceledEvent,
    createOrderMadeEvent,
    createOrderPartiallyTakenEvent,
    createOrdersCleaned,
    createOrdersTakenEvent,
    toArrayString,
} from './mocks';
import { createLendingMarket, createTransaction } from './utils/createEntities';

const maker = Address.zero();
const side = BigInt.fromI32(0).toI32();
const ccy = toBytes32('ETH');
const maturity = BigInt.fromI32(1677628800); // 1st Mar 23
const amount = BigInt.fromI32(100);
const unitPrice = BigInt.fromI32(100);
const amount2 = BigInt.fromI32(200);
const unitPrice2 = BigInt.fromI32(200);

test('Should create a Order when the OrderMade Event is raised', () => {
    const orderId = BigInt.fromI32(1);
    const id = orderId.toHexString();

    const event = createOrderMadeEvent(
        orderId,
        maker,
        side,
        ccy,
        maturity,
        amount,
        unitPrice
    );
    handleOrderMade(event);

    assert.fieldEquals('Order', id, 'orderId', orderId.toString());
    assert.fieldEquals('Order', id, 'maker', maker.toHexString());
    assert.fieldEquals('Order', id, 'side', side.toString());
    assert.fieldEquals('Order', id, 'currency', ccy.toHexString());
    assert.fieldEquals('Order', id, 'maturity', maturity.toString());
    assert.fieldEquals('Order', id, 'amount', amount.toString());
    assert.fieldEquals('Order', id, 'unitPrice', unitPrice.toString());
    assert.fieldEquals('Order', id, 'status', 'Open');
});

test('Should update the Order when the OrderCanceled Event is raised', () => {
    const orderId = BigInt.fromI32(2);
    const id = orderId.toHexString();

    const makeOrderEvent = createOrderMadeEvent(
        orderId,
        maker,
        side,
        ccy,
        maturity,
        amount,
        unitPrice
    );
    handleOrderMade(makeOrderEvent);

    assert.fieldEquals('Order', id, 'status', 'Open');

    const event = createOrderCanceledEvent(
        orderId,
        maker,
        side,
        ccy,
        maturity,
        amount,
        unitPrice
    );

    handleOrderCanceled(event);

    assert.fieldEquals('Order', id, 'orderId', orderId.toString());
    assert.fieldEquals('Order', id, 'status', 'Cancelled');
});

test('Should remove the orders and add transactions when the OrdersCleaned Event is raised', () => {
    const orderId1 = BigInt.fromI32(3);
    const id1 = orderId1.toHexString();
    const orderId2 = BigInt.fromI32(4);
    const id2 = orderId2.toHexString();

    const makeOrderEvent1 = createOrderMadeEvent(
        orderId1,
        maker,
        side,
        ccy,
        maturity,
        amount,
        unitPrice
    );
    handleOrderMade(makeOrderEvent1);
    const makeOrderEvent2 = createOrderMadeEvent(
        orderId2,
        maker,
        side,
        ccy,
        maturity,
        amount2,
        unitPrice2
    );
    handleOrderMade(makeOrderEvent2);

    assert.fieldEquals('Order', id1, 'status', 'Open');
    assert.fieldEquals('Order', id2, 'status', 'Open');

    const filledAmount = BigInt.fromI32(10);
    const filledFutureValue = BigInt.fromI32(11);

    const partialOrderEvent = createOrderPartiallyTakenEvent(
        orderId1,
        maker,
        side,
        ccy,
        maturity,
        filledAmount,
        filledFutureValue
    );
    handleOrderPartiallyTaken(partialOrderEvent);

    assert.fieldEquals('Order', id1, 'status', 'Partially Filled');
    assert.fieldEquals('Order', id1, 'filledAmount', '10');
    assert.fieldEquals('Order', id1, 'amount', '100');

    const event = createOrdersCleaned(
        [orderId1, orderId2],
        maker,
        side,
        ccy,
        maturity
    );

    handleOrdersCleaned(event);

    assert.fieldEquals('Order', id1, 'status', 'Filled');
    assert.fieldEquals('Order', id1, 'filledAmount', '100');
    assert.fieldEquals('Order', id2, 'status', 'Filled');
    assert.fieldEquals('Order', id2, 'filledAmount', '200');

    const txId = event.transaction.hash.toHexString();

    assert.fieldEquals('Transaction', txId + '-0', 'amount', '90');
    assert.fieldEquals(
        'Transaction',
        txId + '-0',
        'orderPrice',
        unitPrice.toString()
    );
    assert.fieldEquals(
        'Transaction',
        txId + '-0',
        'currency',
        ccy.toHexString()
    );
    assert.fieldEquals(
        'Transaction',
        txId + '-0',
        'maturity',
        maturity.toString()
    );
    assert.fieldEquals('Transaction', txId + '-0', 'side', side.toString());
    assert.fieldEquals(
        'Transaction',
        txId + '-0',
        'taker',
        maker.toHexString()
    );

    assert.fieldEquals(
        'Transaction',
        txId + '-1',
        'amount',
        amount2.toString()
    );
    assert.fieldEquals(
        'Transaction',
        txId + '-1',
        'orderPrice',
        unitPrice2.toString()
    );
    assert.fieldEquals(
        'Transaction',
        txId + '-1',
        'currency',
        ccy.toHexString()
    );
    assert.fieldEquals(
        'Transaction',
        txId + '-1',
        'maturity',
        maturity.toString()
    );
    assert.fieldEquals('Transaction', txId + '-1', 'side', side.toString());
    assert.fieldEquals(
        'Transaction',
        txId + '-1',
        'taker',
        maker.toHexString()
    );
});

test('Should create a Transaction when the OrdersTaken Event is raised', () => {
    // Create the market first
    createLendingMarket(ccy, maturity);

    const filledFutureValue = BigInt.fromString('1230000000000000000000');
    const filledAmount = BigInt.fromString('1200000000000000000000');

    const averagePrice = filledAmount.divDecimal(
        new BigDecimal(filledFutureValue)
    );

    const takeOrdersEvent = createOrdersTakenEvent(
        maker,
        side,
        ccy,
        maturity,
        filledAmount,
        unitPrice,
        filledFutureValue
    );
    handleOrdersTaken(takeOrdersEvent);
    const id = takeOrdersEvent.transaction.hash.toHexString() + '-ot';
    assert.fieldEquals('Transaction', id, 'amount', filledAmount.toString());
    assert.fieldEquals(
        'Transaction',
        id,
        'forwardValue',
        filledFutureValue.toString()
    );
    assert.fieldEquals('Transaction', id, 'orderPrice', unitPrice.toString());
    assert.fieldEquals('Transaction', id, 'currency', ccy.toHexString());
    assert.fieldEquals('Transaction', id, 'maturity', maturity.toString());
    assert.fieldEquals('Transaction', id, 'side', side.toString());
    assert.fieldEquals('Transaction', id, 'taker', maker.toHexString());
    assert.fieldEquals(
        'Transaction',
        id,
        'averagePrice',
        averagePrice.toString()
    );
});

test('should update the order amount and create a transaction, when order is partially field', () => {
    const orderId = BigInt.fromI32(21);
    const id = orderId.toHexString();

    const makeOrderEvent = createOrderMadeEvent(
        orderId,
        maker,
        side,
        ccy,
        maturity,
        amount,
        unitPrice
    );
    handleOrderMade(makeOrderEvent);

    assert.fieldEquals('Order', id, 'status', 'Open');
    assert.fieldEquals('Order', id, 'amount', '100');

    const filledAmount = BigInt.fromI32(10);
    const filledFutureValue = BigInt.fromI32(11);

    const averagePrice = filledAmount.divDecimal(
        new BigDecimal(filledFutureValue)
    );

    const partialOrderEvent = createOrderPartiallyTakenEvent(
        orderId,
        maker,
        side,
        ccy,
        maturity,
        filledAmount,
        filledFutureValue
    );
    handleOrderPartiallyTaken(partialOrderEvent);

    assert.fieldEquals('Order', id, 'status', 'Partially Filled');
    assert.fieldEquals('Order', id, 'filledAmount', '10');
    assert.fieldEquals('Order', id, 'amount', '100');

    const txId = partialOrderEvent.transaction.hash.toHexString() + '-opt';
    assert.fieldEquals('Transaction', txId, 'amount', filledAmount.toString());
    assert.fieldEquals(
        'Transaction',
        txId,
        'forwardValue',
        filledFutureValue.toString()
    );
    assert.fieldEquals('Transaction', txId, 'orderPrice', unitPrice.toString());
    assert.fieldEquals('Transaction', txId, 'currency', ccy.toHexString());
    assert.fieldEquals('Transaction', txId, 'maturity', maturity.toString());
    assert.fieldEquals('Transaction', txId, 'side', side.toString());
    assert.fieldEquals('Transaction', txId, 'taker', maker.toHexString());
    assert.fieldEquals(
        'Transaction',
        txId,
        'averagePrice',
        averagePrice.toString()
    );
});

describe('User entity', () => {
    beforeEach(() => {
        clearStore();
        createLendingMarket(ccy, maturity);

        const filledFutureValue = BigInt.fromString('1230000000000000000000');
        const filledAmount = BigInt.fromString('1200000000000000000000');

        createTransaction(
            maker,
            side,
            ccy,
            maturity,
            filledAmount,
            unitPrice,
            filledFutureValue,
            Address.fromString('0x0000000000000000000000000000000000000001'),
            1675845895 // Wednesday, February 8, 2023 8:44:55 AM GMT
        );
    });
    test('Should create an user entity and attach the transaction to it', () => {
        assert.fieldEquals(
            'User',
            maker.toHexString(),
            'transactions',
            toArrayString(['0x0000000000000000000000000000000000000001-ot'])
        );
    });

    test('Should attach the transactions to the existing user entity', () => {
        const filledFutureValue = BigInt.fromString('1230000000000000000000');
        const filledAmount = BigInt.fromString('1200000000000000000000');

        createTransaction(
            maker,
            side,
            ccy,
            maturity,
            filledAmount,
            unitPrice,
            filledFutureValue,
            Address.fromString('0x0000000000000000000000000000000000000002')
        );

        assert.fieldEquals(
            'User',
            maker.toHexString(),
            'transactions',
            toArrayString([
                '0x0000000000000000000000000000000000000001-ot',
                '0x0000000000000000000000000000000000000002-ot',
            ])
        );
    });
});

describe('Transaction Volume', () => {
    beforeEach(() => {
        clearStore();
        createLendingMarket(ccy, maturity);

        const filledFutureValue = BigInt.fromString('1230000000000000000000');
        const filledAmount = BigInt.fromString('1200000000000000000000');

        createTransaction(
            maker,
            side,
            ccy,
            maturity,
            filledAmount,
            unitPrice,
            filledFutureValue,
            Address.fromString('0x0000000000000000000000000000000000000001'),
            1675845895 // Wednesday, February 8, 2023 8:44:55 AM GMT
        );
    });
    test('Should create the daily volume of the market when the OrdersTaken Event is raised', () => {
        const id = getDailyVolumeEntityId(ccy, maturity, '2023-02-08');

        assert.fieldEquals(
            'DailyVolume',
            id,
            'volume',
            '1200000000000000000000'
        );
        assert.fieldEquals('DailyVolume', id, 'day', '2023-02-08');
        assert.fieldEquals('DailyVolume', id, 'currency', ccy.toHexString());
        assert.fieldEquals('DailyVolume', id, 'maturity', maturity.toString());
        assert.fieldEquals('DailyVolume', id, 'timestamp', '1675814400');
    });

    test('Should update the daily volume of the market when the OrdersTaken Event is raised the same day', () => {
        const amount = BigInt.fromString('2230000000000000000000');
        createTransaction(
            maker,
            side,
            ccy,
            maturity,
            amount,
            unitPrice,
            amount,
            Address.fromString('0x0000000000000000000000000000000000000000'),
            1675878200 // Wednesday, February 8, 2023 5:43:20 PM
        );

        const id = getDailyVolumeEntityId(ccy, maturity, '2023-02-08');

        assert.fieldEquals(
            'DailyVolume',
            id,
            'volume',
            '3430000000000000000000'
        );
        assert.fieldEquals('DailyVolume', id, 'day', '2023-02-08');
        assert.fieldEquals('DailyVolume', id, 'currency', ccy.toHexString());
        assert.fieldEquals('DailyVolume', id, 'maturity', maturity.toString());
        assert.fieldEquals('DailyVolume', id, 'timestamp', '1675814400');
    });

    test('Should update the daily volume of another market when the currency is different', () => {
        const amount = BigInt.fromString('2230000000000000000000');
        const ccy2 = toBytes32('FIL');
        createLendingMarket(ccy2, maturity);

        createTransaction(
            maker,
            side,
            ccy2,
            maturity,
            amount,
            unitPrice,
            amount,
            Address.fromString('0x0000000000000000000000000000000000000000'),
            1675878200 // Wednesday, February 8, 2023 5:43:20 PM
        );

        const id = getDailyVolumeEntityId(ccy, maturity, '2023-02-08');
        const id2 = getDailyVolumeEntityId(ccy2, maturity, '2023-02-08');

        assert.fieldEquals('DailyVolume', id2, 'volume', amount.toString());
        assert.fieldEquals('DailyVolume', id2, 'day', '2023-02-08');
        assert.fieldEquals('DailyVolume', id2, 'currency', ccy2.toHexString());
        assert.fieldEquals('DailyVolume', id2, 'maturity', maturity.toString());
        assert.fieldEquals('DailyVolume', id2, 'timestamp', '1675814400');

        assert.fieldEquals(
            'DailyVolume',
            id,
            'volume',
            '1200000000000000000000'
        );
    });
});
