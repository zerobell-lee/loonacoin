const CryptoJS = require('crypto-js'),
    EC = require('elliptic').ec,
    utils = require('./utils');

const ec = new EC('secp256k1');

class TxOut {
    constructor(address, amount) {
        this.address = address;
        this.amount = amount;
    }
}

class TxIn {
    // uTxOutId
    // uTxOutIndex
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

let uTxOuts = [];

const getTxId = tx => {
    const txInContent = tx.txIns.map(txIn => txIn.uTxOutId + txIn.txOutIndex).reduce((a, b) => a + b, "");
    const txOutContent = tx.txOuts.map(txOut => txOut.address + txOut.amount).reduce((a, b) => a + b, ""); //굳이 모든 Transaction을 합쳐서 id를 만드는 의미가..?
    
    return CryptoJS.SHA256(txInContent + txOutContent).toString();
}

const findUTxOut = (txOutId, txOutIndex, uTxOutList) => {
    return uTxOutList.find(uTxOut => uTxOut.txOutId === txOutId && uTxOut.txOutIndex === txOutIndex);
} 

const signTxIn = (tx, txInIndex, privateKey, uTxOut) => {
    const txIn = tx.txIns[txInIndex];
    const dataToSign = tx.id;

    // To-do : Tx out find

    const referencedUTxOut = findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOuts);
    if (referencedUTxOut === null) {
        return;
    }

    const key = ec.keyFromPrivate(privateKey, "hex");
    const signature = utils.toHexString(key.sign(dataToSign).toDER()); // DER이 뭔데

    return signature;

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