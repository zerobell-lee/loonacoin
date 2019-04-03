const WebSockets = require('ws');

const sockets = [];

const getSockets = () => sockets;

//웹소켓과 HTTP는 같은 포트에 공존이 가능하다. 프로토콜이 다르기 때문.
const startP2Pserver = server => {
    const wsServer = new WebSockets.Server({server});
    wsServer.on('connection', ws => {
        initSocketConnection(ws);
    })
    console.log('Loona Coin P2P Server Running!');
};

const initSocketConnection = socket => {
    sockets.push(socket);
    socket.on('message', (data) => {
        console.log(data);
    });
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