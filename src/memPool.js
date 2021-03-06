const _ = require('lodash'),
    Transactions = require('./transactions');

const { validateTx } = Transactions;

let mempool = [];

const getMempool = () => _.cloneDeep(mempool);

const getTxInsInPool = mempool => {
    return _(mempool).map(tx => tx.txIns).flatten().value();
}

const isTxValidForPool = (tx, mempool) => {
    const txInsInPool = getTxInsInPool(mempool);

    const isTxInAlreadyInPool = (txIns, txIn) => {
        return _.find(txIns, txInInPool => {
            return (
                txIn.txOutIndex === txInInPool.txOutIndex && txIn.txOutId === txInInPool.txOutId //비교연산자 순서를 서로 바꾸는게 더 직관적이다..
            )
        })
    }

    for (const txIn of tx.txIns) {
        if (isTxInAlreadyInPool(txInsInPool, txIn)) {
            return false;
        }
    }

    return true;
}

const addToMempool = (tx, uTxOutList) => {
    if (!validateTx(tx, uTxOutList)) {
        throw Error("This transaction is invalid. Will not add it to pool.");
    } else if (!isTxValidForPool(tx, mempool)) {
        throw Error("This tx is not valid for the pool. Will not add it to pool.");
    }

    mempool.push(tx);
};

module.exports = {
    addToMempool,
    getMempool
}