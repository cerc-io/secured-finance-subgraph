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
    handleItayoseExecuted,
} from '../src/lending-market';
import {
    getDailyVolumeEntityId,
    getOrderEntityId,
} from '../src/utils/id-generation';
import { toBytes32 } from '../src/utils/string';
import {
    createOrderCanceledEvent,
    createOrderMadeEvent,
    createOrderPartiallyTakenEvent,
    createOrdersCleaned,
    createOrdersTakenEvent,
    createItayoseExecutedEvent,
    toArrayString,
} from './mocks';
import { createLendingMarket, createTransaction } from './utils/createEntities';

const maker = Address.zero();
const side = BigInt.fromI32(0).toI32();
const ccy = toBytes32('ETH');
const maturity = BigInt.fromI32(1677628800); // 1st Mar 23
const amount = BigInt.fromI32(100);
const unitPrice = BigInt.fromI32(9000);
const amount2 = BigInt.fromI32(200);
const unitPrice2 = BigInt.fromI32(8000);

test('Should create a Order when the OrderMade Event is raised', () => {
    const orderId = BigInt.fromI32(1);
    const id = getOrderEntityId(orderId, ccy, maturity);

    const event = createOrderMadeEvent(
        orderId,
        maker,
        side,
        ccy,
        maturity,
        amount,
        unitPrice,
        false
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

test('Should create different orders when orderId is same and currency is different', () => {
    const orderId = BigInt.fromI32(1);
    const id1 = getOrderEntityId(orderId, ccy, maturity);

    const event1 = createOrderMadeEvent(
        orderId,
        maker,
        side,
        ccy,
        maturity,
        amount,
        unitPrice,
        false
    );
    handleOrderMade(event1);

    const maturity2 = BigInt.fromI32(1667628800);
    const id2 = getOrderEntityId(orderId, ccy, maturity2);

    const event2 = createOrderMadeEvent(
        orderId,
        maker,
        side,
        ccy,
        maturity2,
        amount2,
        unitPrice2,
        false
    );
    handleOrderMade(event2);

    assert.fieldEquals('Order', id1, 'orderId', orderId.toString());
    assert.fieldEquals('Order', id1, 'maker', maker.toHexString());
    assert.fieldEquals('Order', id1, 'side', side.toString());
    assert.fieldEquals('Order', id1, 'currency', ccy.toHexString());
    assert.fieldEquals('Order', id1, 'maturity', maturity.toString());
    assert.fieldEquals('Order', id1, 'amount', amount.toString());
    assert.fieldEquals('Order', id1, 'unitPrice', unitPrice.toString());
    assert.fieldEquals('Order', id1, 'status', 'Open');

    assert.fieldEquals('Order', id2, 'orderId', orderId.toString());
    assert.fieldEquals('Order', id2, 'maker', maker.toHexString());
    assert.fieldEquals('Order', id2, 'side', side.toString());
    assert.fieldEquals('Order', id2, 'currency', ccy.toHexString());
    assert.fieldEquals('Order', id2, 'maturity', maturity2.toString());
    assert.fieldEquals('Order', id2, 'amount', amount2.toString());
    assert.fieldEquals('Order', id2, 'unitPrice', unitPrice2.toString());
    assert.fieldEquals('Order', id2, 'status', 'Open');
});

test('Should create different orders when orderId is same and maturity is different', () => {
    const orderId = BigInt.fromI32(1);
    const id1 = getOrderEntityId(orderId, ccy, maturity);

    const event1 = createOrderMadeEvent(
        orderId,
        maker,
        side,
        ccy,
        maturity,
        amount,
        unitPrice,
        false
    );
    handleOrderMade(event1);

    const ccy2 = toBytes32('EFIL');
    const id2 = getOrderEntityId(orderId, ccy2, maturity);

    const event2 = createOrderMadeEvent(
        orderId,
        maker,
        side,
        ccy2,
        maturity,
        amount2,
        unitPrice2,
        false
    );
    handleOrderMade(event2);

    assert.fieldEquals('Order', id1, 'orderId', orderId.toString());
    assert.fieldEquals('Order', id1, 'maker', maker.toHexString());
    assert.fieldEquals('Order', id1, 'side', side.toString());
    assert.fieldEquals('Order', id1, 'currency', ccy.toHexString());
    assert.fieldEquals('Order', id1, 'maturity', maturity.toString());
    assert.fieldEquals('Order', id1, 'amount', amount.toString());
    assert.fieldEquals('Order', id1, 'unitPrice', unitPrice.toString());
    assert.fieldEquals('Order', id1, 'status', 'Open');

    assert.fieldEquals('Order', id2, 'orderId', orderId.toString());
    assert.fieldEquals('Order', id2, 'maker', maker.toHexString());
    assert.fieldEquals('Order', id2, 'side', side.toString());
    assert.fieldEquals('Order', id2, 'currency', ccy2.toHexString());
    assert.fieldEquals('Order', id2, 'maturity', maturity.toString());
    assert.fieldEquals('Order', id2, 'amount', amount2.toString());
    assert.fieldEquals('Order', id2, 'unitPrice', unitPrice2.toString());
    assert.fieldEquals('Order', id2, 'status', 'Open');
});

test('Should update the Order when the OrderCanceled Event is raised', () => {
    const orderId = BigInt.fromI32(2);
    const id = getOrderEntityId(orderId, ccy, maturity);

    const makeOrderEvent = createOrderMadeEvent(
        orderId,
        maker,
        side,
        ccy,
        maturity,
        amount,
        unitPrice,
        false
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
    const id1 = getOrderEntityId(orderId1, ccy, maturity);
    const orderId2 = BigInt.fromI32(4);
    const id2 = getOrderEntityId(orderId2, ccy, maturity);

    const makeOrderEvent1 = createOrderMadeEvent(
        orderId1,
        maker,
        side,
        ccy,
        maturity,
        amount,
        unitPrice,
        false
    );
    handleOrderMade(makeOrderEvent1);
    const makeOrderEvent2 = createOrderMadeEvent(
        orderId2,
        maker,
        side,
        ccy,
        maturity,
        amount2,
        unitPrice2,
        false
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

    assert.fieldEquals('Order', id1, 'status', 'PartiallyFilled');
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
    const txId01 = txId + '-0:1';

    assert.fieldEquals('Transaction', txId01, 'amount', '90');
    assert.fieldEquals(
        'Transaction',
        txId01,
        'orderPrice',
        unitPrice.toString()
    );
    assert.fieldEquals('Transaction', txId01, 'currency', ccy.toHexString());
    assert.fieldEquals('Transaction', txId01, 'maturity', maturity.toString());
    assert.fieldEquals('Transaction', txId01, 'side', side.toString());
    assert.fieldEquals('Transaction', txId01, 'taker', maker.toHexString());
    assert.fieldEquals('Transaction', txId01, 'forwardValue', '100');
    assert.fieldEquals('Transaction', txId01, 'executionType', 'Lazy');

    const txId11 = txId + '-1:1';
    assert.fieldEquals('Transaction', txId11, 'amount', amount2.toString());
    assert.fieldEquals(
        'Transaction',
        txId11,
        'orderPrice',
        unitPrice2.toString()
    );
    assert.fieldEquals('Transaction', txId11, 'currency', ccy.toHexString());
    assert.fieldEquals('Transaction', txId11, 'maturity', maturity.toString());
    assert.fieldEquals('Transaction', txId11, 'side', side.toString());
    assert.fieldEquals('Transaction', txId11, 'taker', maker.toHexString());
    assert.fieldEquals('Transaction', txId11, 'forwardValue', '250');
    assert.fieldEquals('Transaction', txId11, 'executionType', 'Lazy');
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
    const id = takeOrdersEvent.transaction.hash.toHexString() + ':1';
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
    assert.fieldEquals('Transaction', id, 'executionType', 'Sync');
});

test('Should create multiple Transaction when the multiple OrdersTaken Events are emitted under same transaction', () => {
    // Create the market first
    createLendingMarket(ccy, maturity);

    const filledFutureValue = BigInt.fromString('1230000000000000000000');
    const filledAmount = BigInt.fromString('1200000000000000000000');

    const takeOrdersEvent1 = createOrdersTakenEvent(
        maker,
        side,
        ccy,
        maturity,
        filledAmount,
        BigInt.fromString('9500'),
        filledFutureValue,
        Address.fromString('0x0000000000000000000000000000000000000001'),
        BigInt.fromI32(1)
    );
    handleOrdersTaken(takeOrdersEvent1);

    const takeOrdersEvent2 = createOrdersTakenEvent(
        maker,
        side,
        ccy,
        maturity,
        filledAmount,
        BigInt.fromString('9200'),
        filledFutureValue,
        Address.fromString('0x0000000000000000000000000000000000000001'),
        BigInt.fromI32(2)
    );
    handleOrdersTaken(takeOrdersEvent2);

    const takeOrdersEvent3 = createOrdersTakenEvent(
        maker,
        side,
        ccy,
        maturity,
        filledAmount,
        BigInt.fromString('9000'),
        filledFutureValue,
        Address.fromString('0x0000000000000000000000000000000000000001'),
        BigInt.fromI32(3)
    );
    handleOrdersTaken(takeOrdersEvent3);

    const id1 = takeOrdersEvent1.transaction.hash.toHexString() + ':1';
    assert.fieldEquals('Transaction', id1, 'orderPrice', '9500');

    const id2 = takeOrdersEvent2.transaction.hash.toHexString() + ':2';
    assert.fieldEquals('Transaction', id2, 'orderPrice', '9200');

    const id3 = takeOrdersEvent2.transaction.hash.toHexString() + ':3';
    assert.fieldEquals('Transaction', id3, 'orderPrice', '9000');
});

test('should update the order amount and create a transaction, when order is partially field', () => {
    const orderId = BigInt.fromI32(21);
    const id = getOrderEntityId(orderId, ccy, maturity);

    const makeOrderEvent = createOrderMadeEvent(
        orderId,
        maker,
        side,
        ccy,
        maturity,
        amount,
        unitPrice,
        false
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

    assert.fieldEquals('Order', id, 'status', 'PartiallyFilled');
    assert.fieldEquals('Order', id, 'filledAmount', '10');
    assert.fieldEquals('Order', id, 'amount', '100');

    const txId = partialOrderEvent.transaction.hash.toHexString() + ':1';
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

        const orderId = BigInt.fromI32(1);

        const event = createOrderMadeEvent(
            orderId,
            maker,
            side,
            ccy,
            maturity,
            amount,
            unitPrice,
            false
        );
        handleOrderMade(event);
    });
    test('Should create an user entity and attach the transaction to it', () => {
        assert.fieldEquals(
            'User',
            maker.toHexString(),
            'transactions',
            toArrayString(['0x0000000000000000000000000000000000000001:1'])
        );
        assert.fieldEquals(
            'User',
            maker.toHexString(),
            'transactionCount',
            '1'
        );
    });

    test('Should create an order entity and attach the order to it', () => {
        assert.fieldEquals(
            'User',
            maker.toHexString(),
            'orders',
            toArrayString(['0x1:ETH:1677628800'])
        );
        assert.fieldEquals('User', maker.toHexString(), 'orderCount', '1');
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
                '0x0000000000000000000000000000000000000001:1',
                '0x0000000000000000000000000000000000000002:1',
            ])
        );
        assert.fieldEquals(
            'User',
            maker.toHexString(),
            'transactionCount',
            '2'
        );
    });

    test('Should attach the orders to the existing user entity', () => {
        const maturity = BigInt.fromI32(1667628800);
        const orderId = BigInt.fromI32(2);

        const event = createOrderMadeEvent(
            orderId,
            maker,
            side,
            ccy,
            maturity,
            amount,
            unitPrice,
            false
        );
        handleOrderMade(event);

        assert.fieldEquals(
            'User',
            maker.toHexString(),
            'orders',
            toArrayString(['0x1:ETH:1677628800', '0x2:ETH:1667628800'])
        );
        assert.fieldEquals('User', maker.toHexString(), 'orderCount', '2');
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

describe('Itayose Transactions', () => {
    beforeEach(() => {
        clearStore();
        createLendingMarket(ccy, maturity);
    });

    test('should update the market details when itayose is executed', () => {
        const openingUnitPrice = BigInt.fromI32(8050);
        const lastLendUnitPrice = BigInt.fromI32(8100);
        const lastBorrowUnitPrice = BigInt.fromI32(8000);
        const offsetAmount = BigInt.fromI32(80890);
        const itayoseExecutedEvent = createItayoseExecutedEvent(
            ccy,
            maturity,
            openingUnitPrice,
            lastLendUnitPrice,
            lastBorrowUnitPrice,
            offsetAmount
        );
        handleItayoseExecuted(itayoseExecutedEvent);
        const id = ccy.toHexString() + '-' + maturity.toString();

        assert.fieldEquals('LendingMarket', id, 'currency', ccy.toHexString());
        assert.fieldEquals(
            'LendingMarket',
            id,
            'maturity',
            maturity.toString()
        );
        assert.fieldEquals(
            'LendingMarket',
            id,
            'openingUnitPrice',
            openingUnitPrice.toString()
        );
        assert.fieldEquals(
            'LendingMarket',
            id,
            'lastLendUnitPrice',
            lastLendUnitPrice.toString()
        );
        assert.fieldEquals(
            'LendingMarket',
            id,
            'lastBorrowUnitPrice',
            lastBorrowUnitPrice.toString()
        );
        assert.fieldEquals(
            'LendingMarket',
            id,
            'offsetAmount',
            offsetAmount.toString()
        );
    });

    test('should create the transactions with opening unit price only which were filled during itayose', () => {
        const borrow = 1;
        const lend = 0;

        const orderId1 = BigInt.fromI32(1);
        const unitPrice1 = BigInt.fromI32(8200);
        const event1 = createOrderMadeEvent(
            orderId1,
            maker,
            lend,
            ccy,
            maturity,
            amount2,
            unitPrice1,
            true
        );
        handleOrderMade(event1);

        const orderId2 = BigInt.fromI32(2);
        const unitPrice2 = BigInt.fromI32(8100);
        const event2 = createOrderMadeEvent(
            orderId2,
            maker,
            lend,
            ccy,
            maturity,
            amount,
            unitPrice2,
            true
        );
        handleOrderMade(event2);

        const orderId3 = BigInt.fromI32(3);
        const unitPrice3 = BigInt.fromI32(8000);
        const event3 = createOrderMadeEvent(
            orderId3,
            maker,
            lend,
            ccy,
            maturity,
            amount2,
            unitPrice3,
            true
        );
        handleOrderMade(event3);

        const orderId4 = BigInt.fromI32(4);
        const unitPrice4 = BigInt.fromI32(7900);
        const event4 = createOrderMadeEvent(
            orderId4,
            maker,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice4,
            true
        );
        handleOrderMade(event4);

        const orderId5 = BigInt.fromI32(5);
        const unitPrice5 = BigInt.fromI32(8000);
        const event5 = createOrderMadeEvent(
            orderId5,
            maker,
            borrow,
            ccy,
            maturity,
            amount2,
            unitPrice5,
            true
        );
        handleOrderMade(event5);

        const orderId6 = BigInt.fromI32(6);
        const unitPrice6 = BigInt.fromI32(8020);
        const event6 = createOrderMadeEvent(
            orderId6,
            maker,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice6,
            true
        );
        handleOrderMade(event6);

        const orderId7 = BigInt.fromI32(7);
        const unitPrice7 = BigInt.fromI32(7800);
        const event7 = createOrderMadeEvent(
            orderId7,
            maker,
            borrow,
            ccy,
            maturity,
            amount,
            unitPrice7,
            false
        );
        handleOrderMade(event7);

        const openingUnitPrice = BigInt.fromI32(8050);
        const lastLendUnitPrice = BigInt.fromI32(8100);
        const lastBorrowUnitPrice = BigInt.fromI32(8000);
        const offsetAmount = BigInt.fromI32(300);
        const itayoseExecutedEvent = createItayoseExecutedEvent(
            ccy,
            maturity,
            openingUnitPrice,
            lastLendUnitPrice,
            lastBorrowUnitPrice,
            offsetAmount
        );
        handleItayoseExecuted(itayoseExecutedEvent);

        const cleanEvent1 = createOrdersCleaned(
            [orderId1, orderId2, orderId3],
            maker,
            lend,
            ccy,
            maturity
        );
        handleOrdersCleaned(cleanEvent1);

        const txId1 = cleanEvent1.transaction.hash.toHexString();
        const txId10 = txId1 + '-0:1';
        const txId11 = txId1 + '-1:1';
        const txId12 = txId1 + '-2:1';

        assert.fieldEquals(
            'Transaction',
            txId10,
            'orderPrice',
            openingUnitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId11,
            'orderPrice',
            openingUnitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId12,
            'orderPrice',
            unitPrice3.toString()
        );

        const cleanEvent2 = createOrdersCleaned(
            [orderId4, orderId5, orderId6, orderId7],
            maker,
            borrow,
            ccy,
            maturity
        );
        handleOrdersCleaned(cleanEvent2);

        const txId2 = cleanEvent2.transaction.hash.toHexString();
        const txId20 = txId2 + '-0:1';
        const txId21 = txId2 + '-1:1';
        const txId22 = txId2 + '-2:1';
        const txId23 = txId2 + '-3:1';

        assert.fieldEquals(
            'Transaction',
            txId20,
            'orderPrice',
            openingUnitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId21,
            'orderPrice',
            openingUnitPrice.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId22,
            'orderPrice',
            unitPrice6.toString()
        );
        assert.fieldEquals(
            'Transaction',
            txId23,
            'orderPrice',
            unitPrice7.toString()
        );
    });
});
