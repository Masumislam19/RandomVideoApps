const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const waitingUsers = [];

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VibeConnect Match + WebRTC Server',
  });
});

function removeFromQueue(socketId) {
  const index = waitingUsers.indexOf(socketId);

  if (index !== -1) {
    waitingUsers.splice(index, 1);
  }
}

function findMatch(socket) {
  removeFromQueue(socket.id);

  while (waitingUsers.length > 0) {
    const otherId = waitingUsers.shift();

    if (!otherId || otherId === socket.id) {
      continue;
    }

    const otherSocket = io.sockets.sockets.get(otherId);

    if (!otherSocket) {
      continue;
    }

    socket.data.partnerId = otherId;
    otherSocket.data.partnerId = socket.id;

    socket.emit('matched', {
      partnerId: otherId,
      initiator: true,
    });

    otherSocket.emit('matched', {
      partnerId: socket.id,
      initiator: false,
    });

    return;
  }

  waitingUsers.push(socket.id);
  socket.emit('waiting');
}

function relayToPartner(socket, event, payload) {
  const partnerId = socket.data.partnerId;

  if (!partnerId) {
    return;
  }

  const partner = io.sockets.sockets.get(partnerId);

  if (partner) {
    partner.emit(event, payload);
  }
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('find_match', () => {
    findMatch(socket);
  });

  socket.on('offer', ({ offer }) => {
    relayToPartner(socket, 'offer', {
      offer,
    });
  });

  socket.on('answer', ({ answer }) => {
    relayToPartner(socket, 'answer', {
      answer,
    });
  });

  socket.on('ice-candidate', ({ candidate }) => {
    relayToPartner(socket, 'ice-candidate', {
      candidate,
    });
  });

  socket.on('chat-message', ({ text }) => {
    if (typeof text !== 'string') return;

    const cleanText = text.trim().slice(0, 500);
    if (!cleanText) return;

    relayToPartner(socket, 'chat-message', {
      text: cleanText,
      senderId: socket.id,
      timestamp: Date.now(),
    });
  });

  socket.on('next', () => {
    const partnerId = socket.data.partnerId;

    socket.data.partnerId = null;
    removeFromQueue(socket.id);

    if (partnerId) {
      const partner = io.sockets.sockets.get(partnerId);

      if (partner) {
        partner.data.partnerId = null;
        partner.emit('partner_left');
        findMatch(partner);
      }
    }

    findMatch(socket);
  });

  socket.on('disconnect', () => {
    removeFromQueue(socket.id);

    const partnerId = socket.data.partnerId;

    if (partnerId) {
      const partner = io.sockets.sockets.get(partnerId);

      if (partner) {
        partner.data.partnerId = null;
        partner.emit('partner_left');
      }
    }

    console.log('Disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VibeConnect server running on port ${PORT}`);
});
