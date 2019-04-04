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
}