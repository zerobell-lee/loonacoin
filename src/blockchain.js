const CryptoJS = require('crypto-js');

class Block {
    constructor(index, hash, previousHash, timestamp, data) {
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
    }
}

const genesisBlock = new Block(
    0,
    "2AFDJFKJDLKDJKLFJKLDJKLJ",
    null,
    new Date().getTime() / 1000,
    "This is the genesis!!"
);

let blockchain = [genesisBlock];

const getLastBlock = () => blockchain[blockchain.length - 1];
const getTimeStamp = () => new Date().getTime() / 1000;
const getBlockChain = () => blockchain;

const createHash = (index, previousHash, timestamp, data) => {
    return CryptoJS.SHA256(index + previousHash + timestamp + JSON.stringify(data)).toString();
}

const createNewBlock = data => {
    const previousBlock = getLastBlock();
    const newBlockIndex = previousBlock.index + 1;
    const newTimeStamp = getTimeStamp();
    const newHash = createHash(newBlockIndex, previousBlock.hash, newTimeStamp, data);

    const newBlock = new Block(newBlockIndex, newHash, previousBlock.hash, newTimeStamp, data);

    addBlockToChain(newBlock);
    
    return newBlock;
}

const getBlockHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data);

const isNewBlockValid = (candidate, latest) => {
    if (!isNewStructureValid(candidate)) {
        console.log('The structure of the candidate block is invalid.');
        return false;
    }
    else if (latest.index + 1 !== candidate.index) {
        console.log('The candidate doesnt have a valid index.');
        return false;
    } else if (latest.hash !== candidate.previousHash) {
        console.log('The previous hash of the candidate is not the hash of the latest block.');
        return false;
    } else if (getBlockHash(candidate) !== candidate.hash) {
        console.log('The hash of the candidate is invalid.');
        return false;
    }
    return true;
}

const isNewStructureValid = (block) => {
    return (
        typeof block.index === 'number' &&
        typeof block.hash === 'string' &&
        typeof block.previousHash === 'string' &&
        typeof block.timestamp === 'number' &&
        typeof block.data === 'string'
    )
}

const isChainValid = (candidateChain) => {
    const isGenesisValid = block => {
        return JSON.stringify(block) === JSON.stringify(genesisBlock);
    }

    if (!isGenesisValid(candidateChain[0])) {
        console.log("The candidateChain's genesis block is not the same as our genesis block.");
        return false;
    }

    for (let i = 1; i < candidateChain.length; i++) {
        if (isNewBlockValid(candidateChain[i], candidateChain[i-1])) {
            return false;
        }
    }

    return true;
}; //모두 하나의 제네시스를 공유해야한다. 그리고, 하나의 제네시스 블록에서 서로 다른 체인을 만드는 것도 가능하다. 다양한 거래 생성이 가능하단 소리!

const replaceChain = candidateChain => {
    if (isChainValid(candidateChain) && candidateChain.length > getBlockChain().length) {
        blockchain = candidateChain;
        return true;
    } else {
        return false;
    }
};

const addBlockToChain = candidate => {
    if (isNewBlockValid(candidate, getLastBlock())) {
        getBlockChain().push(candidate);
        return true;
    } else {
        return false;
    }
}

module.exports = {
    getBlockChain,
    createNewBlock
}