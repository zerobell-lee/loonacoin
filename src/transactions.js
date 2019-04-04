const CryptoJS = require('crypto-js'),
    EC = require('elliptic').ec,
    utils = require('./utils');

const ec = new EC('secp256k1');

const COINBASE_AMOUNT = 50;

class TxOut {
    constructor(address, amount) {
        this.address = address;
        this.amount = amount;
    }
}

class TxIn {
    // txOutId
    // txOutIndex
    // Signature
}

class Transaction {
    // ID
    // txIns[]
    // txOuts[]

}

class UTxOut {
    constructor(txOutId, txOutIndex, address, amount) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.address = address;
        this.amount = amount;
    }
}



const getTxId = tx => {
    const txInContent = tx.txIns.map(txIn => txIn.uTxOutId + txIn.txOutIndex).reduce((a, b) => a + b, "");
    const txOutContent = tx.txOuts.map(txOut => txOut.address + txOut.amount).reduce((a, b) => a + b, ""); //굳이 모든 Transaction을 합쳐서 id를 만드는 의미가..?
    
    return CryptoJS.SHA256(txInContent + txOutContent).toString();
}

const findUTxOut = (txOutId, txOutIndex, uTxOutList) => {
    return uTxOutList.find(uTxOut => uTxOut.txOutId === txOutId && uTxOut.txOutIndex === txOutIndex);
} 

const signTxIn = (tx, txInIndex, privateKey, uTxOutList) => {
    const txIn = tx.txIns[txInIndex];
    const dataToSign = tx.id;

    // To-do : Tx out find

    const referencedUTxOut = findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList);
    if (referencedUTxOut === null) {
        return;
    }
    const referencedAddress = referencedUTxOut.address;
    if (getPublicKey(privateKey) !== referencedAddress) {
        return false;
    }
    const key = ec.keyFromPrivate(privateKey, "hex");
    const signature = utils.toHexString(key.sign(dataToSign).toDER()); // DER이 뭔데

    return signature;

};

const getPublicKey = privateKey => {
    return ec.keyFromPrivate(privateKey, 'hex').getPublic().encode('hex');
}

const updateUTxOuts = (newTxs, uTxOutList) => {
    const newUTxOuts = newTxs.map(tx => {
        tx.txOuts.map((txOut, index) => {
            return new UTxOut(tx.id, index, txOut.address, txOut.amount);
        });
    }).reduce((a, b) => a.concat(b), []); // Transaction 발생. 새로운 UTx가 최소 2개 생겨난다.

    const spentTxOuts = newTxs.map(tx => tx.txIns).reduce((a, b) => a.concat(b), []).map(txIn => new UTXOut(txIn.txOutId, txIn.txOutIndex, '', 0));
    // 이미 사용된 TxInput은 없애버려야 한다. 비워버리는 과정

    const resultingUTxOuts = uTxOutList.filter(uTxO => !findUTxOut(uTxO.txOutId, uTxO.txOutIndex, spentTxOuts)).concat(newUTxOuts);
    // 이전의 UtxOut을 비웠고, 새로운 UtxOut을 생성했으니, 전체 uTxOutList를 갱신해준다.

    return resultingUTxOuts;
};

const isTxInStructureValid = (txIn) => {
    if (txIn === null) {
        return false;
    } else if (typeof txIn.signature !== 'string') {
        return false;
    } else if (typeof txIn.txOutId !== 'number') {
        return false;
    } else if (typeof txIn.txOutIndex !== 'number') {
        return false;
    } else {
        return true;
    }
}

const isAddressValid = (address) => {
    if (address.length !== 130) {
        return false;
    } else if (address.match("^[a-fA-F0-9]+$") === null) {
        return false;
    } else if (!address.startsWith('04')) {
        return false;
    } else {
        return true; 
    }
    // 왜 130이며, 04로 시작하는 이유가 따로 있는지?
}

const isTxOutStructureValid = (txOut) => {
    if (txOut === null) {
        return false;
    } else if (typeof txOut.address !== 'string') {
        return false;
    } else if (!isAddressValid(txOut.address)) {
        return false;
    } else if (typeof txOut.amount !== 'number') {
        return false;
    } else {
        true;
    }
}

const isTxStructureValid = (tx) => {
    if (typeof tx.id !== 'string') {
        console.log('Tx ID is not valid.');
        return false;
    } else if (!(tx.txIns instanceof Array)) {
        console.log('Tx inputs are not an array');
        return false;
    } else if (!tx.txIns.map(isTxInStructureValid).reduce((a, b) => a && b, true)) {
        console.log('The structure of one of the txIn is not valid');
        return false;
    } else if (!(tx.txOuts instanceof Array)) {
        console.log('The txOuts are not an array');
        return false;
    } else if (!tx.txOuts.map(isTxOutStructureValid).reduce((a, b) => a && b, true)) {
        console.log('The structure of one of the txOut is not valid');
        return false;
    } else {
        return true;
    }
}

const validateTxIns = (txIn, tx, uTxOutList) => {
    const wantedTxOut = uTxOutList.find(uTxOut => uTxOut.txOutId === txIn.txOutId && uTxOut.txOutIndex === txIn.txOutIndex);

    if (wantedTxOut === null) {
        return false;
    } else {
        const address = wantedTxOut.address;
        const key = ec.keyFromPublic(address, "hex");
        return key.verify(tx.id, txIn.signature); // ??? 잘 모르겠음. txIn.signature를 key로 해제한 결과를 tx.id와 일치하는지 확인하는 것인가?
    }

}

const getAmountInTxIn = (txIn, uTxOutList) => findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList).amount

const validateTx = (tx, uTxOutList) => {

    if (!isTxStructureValid(tx)) {
        return false;
    }

    if (getTxId(tx) !== tx.id) {
        return false
    }

    const hasValidTxIns = tx.txIns.map(txIn => validateTxIn(txIn, tx, uTxOutList));

    if (!hasValidTxIns) {
        return false;
    }

    const amountInTxIns = tx.txIns.map(txIn => getAmountInTxIn(txIn, uTxOutList)).reduce((a, b) => a + b, 0);//todo

    const amountInTxOuts = tx.txOuts.map(txOut => txOut.amount).reduce((a, b) => a + b, 0);//todo

    if (amountInTxIns !== amountInTxOuts) {
        return false;
    } else {
        return true;
    }

}

const validateCoinbaseTx = (tx, blockIndex) => {
    if (getTxId(tx) !== tx.id) {
        return false;
    } else if (tx.txIns.length !== 1) {
        return false;
    } else if (tx.txIns[0].txOutIndex !== blockIndex) { //Coinbase 트랜잭션은 당연히 새로 생겨났으므로 OutIndex란게 없다. 이 경우, 블록 인덱스를 갖는다.
        return false;
    } else if (tx.txOuts.length !== 1) {
        return false;
    } else if (tx.txOuts[0].amount !== COINBASE_AMOUNT) {
        return false;
    } else {
        return true;
    }
}

const createCoinbaseTx = (address, blockIndex) => {
    const tx = new Transaction();
    const txIn = new TxIn();
    txIn.signature = '';
    txIn.txOutId = blockIndex;
    tx.txIns = [txIn];
    tx.txOuts = [new TxOut(address, COINBASE_AMOUNT)];
    tx.id = getTxId(tx);

    return tx;
}

module.exports = {
    getPublicKey,
    getTxId,
    signTxIn,
    TxIn,
    Transaction,
    TxOut,
    createCoinbaseTx
};