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