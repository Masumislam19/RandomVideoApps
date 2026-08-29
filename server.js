const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const waiting = [];
const partners = new Map();

function removeFromWaiting(socketId) {
  const index = waiting.indexOf(socketId);

  if (index !== -1) {
    waiting.splice(index, 1);
  }
}

function findMatch(socket) {
  removeFromWaiting(socket.id);

  const partnerId = waiting.shift();

  if (!partnerId) {
    waiting.push(socket.id);
    socket.emit('waiting');
    return;
  }

  const partner = io.sockets.sockets.get(partnerId);

  if (!partner) {
    return findMatch(socket);
  }

  partners.set(socket.id, partner.id);
  partners.set(partner.id, socket.id);

  socket.emit('matched', {
    initiator: true,
  });

  partner.emit('matched', {
    initiator: false,
  });
}

function getPartner(socketId) {
  const partnerId = partners.get(socketId);

  if (!partnerId) {
    return null;
  }

  return io.sockets.sockets.get(partnerId) || null;
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('join-match', () => {
    findMatch(socket);
  });

  socket.on('offer', ({ offer }) => {
    const partner = getPartner(socket.id);

    if (partner) {
      partner.emit('offer', { offer });
    }
  });

  socket.on('answer', ({ answer }) => {
    const partner = getPartner(socket.id);

    if (partner) {
      partner.emit('answer', { answer });
    }
  });

  socket.on('ice-candidate', ({ candidate }) => {
    const partner = getPartner(socket.id);

    if (partner) {
      partner.emit('ice-candidate', { candidate });
    }
  });

  socket.on('next', () => {
    const partner = getPartner(socket.id);

    if (partner) {
      partners.delete(socket.id);
      partners.delete(partner.id);

      partner.emit('disconnected-partner');

      findMatch(partner);
    }

    findMatch(socket);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);

    removeFromWaiting(socket.id);

    const partner = getPartner(socket.id);

    if (partner) {
      partners.delete(socket.id);
      partners.delete(partner.id);

      partner.emit('disconnected-partner');
    }
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`VibeConnect server running on port ${PORT}`);
});
