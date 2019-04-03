const CryptoJS = require('crypto-js');

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
    constructor(uTxOutId, uTxOutIndex, address, amount) {
        this.uTxOutId = uTxOutId;
        this.uTxOutIndex = uTxOutIndex;
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

