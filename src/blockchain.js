const CryptoJS = require('crypto-js'),
    Wallet = require('./wallet'),
    hexToBinary = require('hex-to-binary');

const { getBalance, getPublicFromWallet } = Wallet;

const BLOCK_GENERATIONAL_INTERVAL = 10; // 초단위. 블록 채굴에 걸리는 시간.
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10; // 비트코인일 경우, 2016개

class Block {
    constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

const genesisBlock = new Block(
    0,
    "2AFDJFKJDLKDJKLFJKLDJKLJ",
    null,
    1520408045,
    "This is the genesis!!",
    10,
    0
);

let blockchain = [genesisBlock];

let uTxOuts = [];

const getNewestBlock = () => blockchain[blockchain.length - 1];
const getTimeStamp = () => Math.round(new Date().getTime() / 1000);
const getBlockChain = () => blockchain;

const createHash = (index, previousHash, timestamp, data, difficulty, nonce) => {
    return CryptoJS.SHA256(index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce).toString();
}

const createNewBlock = data => {
    const previousBlock = getNewestBlock();
    const newBlockIndex = previousBlock.index + 1;
    const newTimeStamp = getTimeStamp();
    const difficulty = findDifficulty();

    const newBlock = findBlock(newBlockIndex, previousBlock.hash, newTimeStamp, data, difficulty);

    addBlockToChain(newBlock);

    require('./p2p').broadcastNewBlock();
    
    return newBlock;
}

const findDifficulty = () => {
    const newestBlock = getNewestBlock();

    if (newestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && newestBlock.index !== 0) {
        return calculateNewDifficulty(newestBlock, getBlockChain())
    } else {
        return newestBlock.difficulty;
    }

}

const calculateNewDifficulty = (newestBlock, blockchain) => {
    const lastCalculatedBlock = blockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const timeExpected = BLOCK_GENERATIONAL_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const timeTaken = newestBlock.timestamp - lastCalculatedBlock.timestamp;

    if (timeTaken < timeExpected/2) {
        return lastCalculatedBlock.difficulty + 1;
    } else if (timeTaken > timeExpected * 2) {
        return lastCalculatedBlock.difficulty - 1; //만일 difficulty가 음수가 되는 경우가 생긴다면?
    } else {
        return lastCalculatedBlock.difficulty;
    }

}

const findBlock = (index, previousHash, timestamp, data, difficulty) => {
    let nonce = 0;
    while (true) {
        const hash = createHash(index,
            previousHash,
            timestamp,
            data,
            difficulty,
            nonce);

            if (hashMatchesDifficulty(hash, difficulty)) {
                return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce)
            } else {
                nonce++;
            }
    };

};

const hashMatchesDifficulty = (hash, difficulty) => {
    const hashInBinary = hexToBinary(hash);
    const requiredZeros = '0'.repeat(difficulty);
    console.log(`Trying difficulty: ${difficulty} with hash ${hash}`)
    return hashInBinary.startsWith(requiredZeros);
}

const getBlockHash = (block) => createHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);

const isTimeStampValid = (newBlock, oldBlock) => {
    return (oldBlock.timestamp - 60 < newBlock.timestamp && newBlock.timestamp - 60 < getTimeStamp());
}

const isBlockValid = (candidate, latest) => {
    if (!isBlockStructureValid(candidate)) {
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
    } else if (!isTimeStampValid(candidate, latest)) {
        console.log('The timestamp of this block is dodgy.');
        return false;
    }
    return true;
}

const isBlockStructureValid = (block) => {
    return (
        typeof block.index === 'number' &&
        typeof block.hash === 'string' &&
        typeof block.previousHash === 'string' &&
        typeof block.timestamp === 'number' &&
        typeof block.data === 'string' &&
        typeof block.difficulty === 'number' &&
        typeof block.nonce === 'number'
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
        if (!isBlockValid(candidateChain[i], candidateChain[i-1])) {
            return false;
        }
    }

    return true;
}; //모두 하나의 제네시스를 공유해야한다. 그리고, 하나의 제네시스 블록에서 서로 다른 체인을 만드는 것도 가능하다. 다양한 거래 생성이 가능하단 소리!

const sumDifficulty = anyBlockchain => 
    anyBlockchain.map(block => Math.pow(2, block.difficulty))
    .reduce((a, b) => a + b);

const replaceChain = candidateChain => {
    if (isChainValid(candidateChain) && 
        sumDifficulty(candidateChain) > sumDifficulty(getBlockChain())) 
    {
        blockchain = candidateChain;
        return true;
    } else {
        return false;
    }
};

const addBlockToChain = candidate => {
    if (isBlockValid(candidate, getNewestBlock())) {
        getBlockChain().push(candidate);
        return true;
    } else {
        return false;
    }
}

const getAccountBalance = () => getBalance(getPublicFromWallet(), uTxOuts);

module.exports = {
    getNewestBlock,
    getBlockChain,
    createNewBlock,
    isBlockStructureValid,
    isBlockValid,
    addBlockToChain,
    replaceChain,
    getAccountBalance
}