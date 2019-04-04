const EC = require('elliptic').ec,
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    Transactions = require('./transactions');

const { getPublicKey, getTxId, signTxIn, TxIn, Transaction, TxOut } = Transactions;

const ec = new EC('secp256k1');

const privateKeyLocation = path.join(__dirname, 'privateKey');

const generatePrivateKey = () => {
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate();
    return privateKey.toString(16);
};

const getPrivateFromWallet = () => {
    const buffer = fs.readFileSync(privateKeyLocation, 'utf8');
    return buffer.toString();
}

const getPublicFromWallet = () => {
    const privateKey = getPrivateFromWallet();
    const key = ec.keyFromPrivate(privateKey, 'hex');
    return key.getPublic().encode('hex');
};

const getBalance = (address, uTxOuts) => {
    return _(uTxOuts).filter(uTxOut => uTxOut.address === address).map(uTxOut => uTxOut.amount).sum();
}

const initWallet = () => {
    if (fs.existsSync(privateKeyLocation)) {
        return ;
    }
    const newPrivateKey = generatePrivateKey();

    fs.writeFileSync(privateKeyLocation, newPrivateKey);
};

const findAmountInUTxOuts = (amountNeeded, myUTxOuts) => {
    let currentAmount = 0;
    const includedUTxOuts = [];
    for (const myUTxOut of myUTxOuts) {
        includedUTxOuts.push(myUTxOut);
        currentAmount = currentAmount + myUTxOut.amount;
        if (currentAmount >= amountNeeded) {
            const leftOverAmount = currentAmount - amountNeeded;
            return { includedUTxOuts, leftOverAmount };
        }
    }
    console.log('Not enought founds');
    return false;
}

const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
    const receiverTxOut = new TxOut(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [receiverTxOut];
    } else {
        const leftOverTxOut = new TxOut(myAddress, leftOverAmount);
        return [receiverTxOut, leftOverTxOut];
    }
}

const createTx = (receiverAddress, amount, privateKey, uTxOutList) => {
    const myAddress = getPublicKey(privateKey);
    const myUTxOuts = uTxOutList.filter(uTxOut => uTxOut.address === myAddress);

    const { includedUTxOuts, leftOverAmount } = findAmountInUTxOuts(amount, myUTxOuts);

    const toUnsignedTxIn = uTxOut => {
        const TxIn = new TxIn();
        txIn.txOutId = uTxOut.txOutId;
        txIn.txOutIndex = uTxOut.txOutIndex;
    }

    const unsignedTxIns = includedUTxOuts.map(toUnsignedTxIn);

    const tx = new Transaction();

    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);

    tx.id = getTxId(tx);

    tx.txIns = tx.txIns.map((txIn, index) => {
        txIn.signature = signTxIn(tx, index, privateKey, uTxOutList);
        return txIn;
    });

    return tx;
}

module.exports = {
    initWallet,
    getBalance,
    getPublicFromWallet
}