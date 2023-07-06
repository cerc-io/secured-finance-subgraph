// import { Address, BigInt } from '@graphprotocol/graph-ts';
// import {
//     afterEach,
//     assert,
//     beforeEach,
//     clearStore,
//     describe,
//     test,
// } from 'matchstick-as/assembly/index';
// import { PROTOCOL_ID, getProtocol } from '../src/helper/initializer';
// import {
//     handleLendingMarketCreated,
//     handleLendingMarketsRotated,
// } from '../src/lending-controller';
// import {
//     handleOrderCanceled,
//     handleOrderMade,
//     handleOrderPartiallyTaken,
// } from '../src/lending-market';

// import { buildLendingMarketId, toBytes32 } from '../src/utils/string';
// import {
//     createLendingMarketCreatedEvent,
//     createLendingMarketsRotatedEvent,
//     createOrderCanceledEvent,
//     createOrderMadeEvent,
//     createOrderPartiallyTakenEvent,
//     toArrayString,
// } from './mocks';
// import { ALICE, BOB, createTransaction } from './utils/createEntities';
// import { getOrderEntityId } from '../src/utils/id-generation';

// const lendingMarketAddress = Address.zero();
// const futureValueVault = Address.zero();
// const index = BigInt.fromI32(0);
// const openingDate = BigInt.fromI32(1);
// const maturity = BigInt.fromI32(365);

// const maker = Address.zero();
// const side = BigInt.fromI32(0).toI32();
// const ccy = toBytes32('ETH');
// const amount = BigInt.fromI32(100);
// const unitPrice = BigInt.fromI32(9000);

// afterEach(() => {
//     clearStore();
// });

// const fil = 'FIL';
// const filBytes = toBytes32(fil);
// const ethBytes = toBytes32('ETH');

// const addressList = [
//     Address.fromString('0x0000000000000000000000000000000000000000'), // Dec 22
//     Address.fromString('0x0000000000000000000000000000000000000001'), // Mar 23
//     Address.fromString('0x0000000000000000000000000000000000000010'), // Jun 23
//     Address.fromString('0x0000000000000000000000000000000000000100'), // Sep 23
// ];

// const openingDateList = [
//     BigInt.fromI32(1659852800),
//     BigInt.fromI32(1667628800),
//     BigInt.fromI32(1675577600),
//     BigInt.fromI32(1683526400),
// ];

// const maturityList = [
//     BigInt.fromI32(1669852800),
//     BigInt.fromI32(1677628800),
//     BigInt.fromI32(1685577600),
//     BigInt.fromI32(1693526400),
// ];

// const newMaturity = BigInt.fromI32(1701388800);
// const newAddress = Address.fromString(
//     '0x0000000000000000000000000000000000001000'
// );

// const LENDING_MARKET_ENTITY_NAME = 'LendingMarket';
// const PROTOCOL = 'Protocol';

// const TOTAL_NUMBER_PREPOPULATED_MARKET = 8;
// const assertLendingMarketCreated = (): void => {
//     assert.entityCount(
//         LENDING_MARKET_ENTITY_NAME,
//         TOTAL_NUMBER_PREPOPULATED_MARKET + 1
//     );
// };

// describe('With no lending markets existing', () => {
//     test('Creating a new lending market should create the entity', () => {
//         const event = createLendingMarketCreatedEvent(
//             ethBytes,
//             lendingMarketAddress,
//             futureValueVault,
//             index,
//             openingDate,
//             maturity
//         );
//         handleLendingMarketCreated(event);

//         const id = buildLendingMarketId(ethBytes, maturity);
//         assert.fieldEquals(
//             LENDING_MARKET_ENTITY_NAME,
//             id,
//             'currency',
//             ethBytes.toHexString()
//         );
//         assert.fieldEquals(
//             LENDING_MARKET_ENTITY_NAME,
//             id,
//             'maturity',
//             maturity.toString()
//         );
//         assert.fieldEquals(LENDING_MARKET_ENTITY_NAME, id, 'isActive', 'true');
//     });

//     test('Creating a new lending market should add it to the protocol', () => {
//         const event = createLendingMarketCreatedEvent(
//             ethBytes,
//             lendingMarketAddress,
//             futureValueVault,
//             index,
//             openingDate,
//             maturity
//         );
//         handleLendingMarketCreated(event);

//         assert.entityCount(PROTOCOL, 1);
//         assert.fieldEquals(
//             PROTOCOL,
//             PROTOCOL_ID,
//             'lendingMarkets',
//             toArrayString([buildLendingMarketId(ethBytes, maturity)])
//         );
//     });
// });

// describe('With lending markets already existing', () => {
//     beforeEach(() => {
//         for (let i = 0; i < addressList.length; i++) {
//             const address = addressList[i];
//             const openingDate = openingDateList[i];
//             const maturity = maturityList[i];
//             handleLendingMarketCreated(
//                 createLendingMarketCreatedEvent(
//                     filBytes,
//                     address,
//                     address,
//                     BigInt.fromI32(i),
//                     openingDate,
//                     maturity
//                 )
//             );
//             handleLendingMarketCreated(
//                 createLendingMarketCreatedEvent(
//                     ethBytes,
//                     address,
//                     address,
//                     BigInt.fromI32(i),
//                     openingDate,
//                     maturity
//                 )
//             );
//         }
//     });

//     test('Rotate lending market should create the new Lending Market', () => {
//         const event = createLendingMarketsRotatedEvent(
//             filBytes,
//             maturityList[0],
//             newMaturity
//         );

//         handleLendingMarketsRotated(event);

//         const id = buildLendingMarketId(filBytes, newMaturity);
//         assert.fieldEquals(LENDING_MARKET_ENTITY_NAME, id, 'isActive', 'true');
//         assert.fieldEquals(
//             LENDING_MARKET_ENTITY_NAME,
//             id,
//             'currency',
//             filBytes.toHexString()
//         );
//         assert.fieldEquals(
//             LENDING_MARKET_ENTITY_NAME,
//             id,
//             'maturity',
//             newMaturity.toString()
//         );
//     });

//     test('Rotate lending market should add the new maturity market to the protocol', () => {
//         const event = createLendingMarketsRotatedEvent(
//             filBytes,
//             maturityList[0],
//             newMaturity
//         );

//         handleLendingMarketsRotated(event);

//         const protocol = getProtocol();
//         const lendingMarkets = protocol.lendingMarkets;
//         assert.i32Equals(lendingMarkets.length, 9);
//     });
// });
