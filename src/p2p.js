const WebSockets = require('ws'),
    Blockchain = require('./blockchain');

const sockets = [];

const { getNewestBlock, isBlockStructureValid, isBlockValid, addBlockToChain, replaceChain, getBlockChain } = Blockchain;

// Message Creators

const GET_LATEST = "GET_LATEST";
const GET_ALL = "GET_ALL";
const BLOCKCHAIN_RESPONSE = "BLOCKCHAIN_RESPONSE";

// Message Creators

const getLatest = () => {
    return {
        type: GET_LATEST,
        data: null
    };
};

const getAll = () => {
    return {
        type: GET_ALL,
        data: null
    };
};

const blockchainResponse = (data) => {
    return {
        type: BLOCKCHAIN_RESPONSE,
        data: data
    }
}

const getSockets = () => sockets;

//웹소켓과 HTTP는 같은 포트에 공존이 가능하다. 프로토콜이 다르기 때문.
const startP2Pserver = server => {
    const wsServer = new WebSockets.Server({server});
    wsServer.on('connection', ws => {
        initSocketConnection(ws); //새로운 소켓 커넥션이 감지되면, 이를 초기화하는 과정을 거친다.
    }) //각 서버는 webSocket Server가 된다.
    console.log('Loona Coin P2P Server Running!');
};

const initSocketConnection = ws => {
    sockets.push(ws);
    handleSocketMessage(ws);
    handleSockerError(ws);
    sendMessage(ws, getLatest());  //메시지, 에러에 관한 부분을 대충 끝내고, 최신 노드를 물어본다.
};

const parseData = data => {
    try {
        return JSON.parse(data);
    } catch (e) {
        console.log(e);
        return null;
    }
}

const handleSocketMessage = ws => {
    ws.on('message', data => {
        const message = parseData(data);
        if (message === null) {
            return;
        }
        switch (message.type) {
            case GET_LATEST:
                sendMessage(ws, responseLatest());
                break;
            case GET_ALL:
                sendMessage(ws, responseAll());
                break;
            case BLOCKCHAIN_RESPONSE:
                const receivedBlocks = message.data
                if (receivedBlocks === null) {
                    break;
                }

                handleBlockchainResponse(receivedBlocks);

                break;
            

        }
    });
};

const handleBlockchainResponse = receivedBlocks => {
    if (receivedBlocks.length === 0) {
        console.log("Received Empty Block.");
        return;
    }

    console.log(receivedBlocks);

    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1]; // latest block이라 해도 복수의 블록을 보낼 수 있음.

    if (!isBlockStructureValid(latestBlockReceived)) {
        console.log('The block structure of the block received is invalid.');
        return;
    }

    const newestBlock = getNewestBlock();

    if (latestBlockReceived.index > newestBlock.index) {
        if (newestBlock.hash === latestBlockReceived.previousHash) {
            addBlockToChain(latestBlockReceived);
        } else if (receivedBlocks.length === 1) {
            sendMessageToAll(getAll());
        } else {
            replaceChain(receivedBlocks);
        }
    }


}

const sendMessage = (ws, message) => ws.send(JSON.stringify(message));

const sendMessageToAll = message => sockets.forEach(ws => sendMessage(ws, message));

const responseLatest = () => blockchainResponse([getNewestBlock()])

const responseAll = () => blockchainResponse(getBlockChain());

const handleSockerError = ws => {
    const closeSocketConnection = ws => {
        ws.close();
        sockets.splice(sockets.indexOf(ws), 1);
    }
    ws.on('close', () => closeSocketConnection(ws));
    ws.on('error', () => closeSocketConnection(ws));
}

const connectToPeers = newPeer => {
    const ws = new WebSockets(newPeer); // ? 뭐지
    ws.on('open', () => {
        initSocketConnection(ws);
    })
}

module.exports = {
    startP2Pserver,
    connectToPeers
};