const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.NODE_PORT;

const server = require('http').Server(app);
const io = require('socket.io')(server, {
  path: '/chatserver',
  cors: require('./cors.config'),
  transports: ['websocket'],
});

const Redis = require('ioredis');
// const redisClient = new Redis(require('./redis.config'));

// const { createAdapter: socketRedisAdapter } = require('@socket.io/redis-adapter');
const { createAdapter } = require('@socket.io/cluster-adapter');

/**
 * Express
 */

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(cors(require('./cors.config')));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const rooms = {};

app.get('/', (req, res) => {
  res.render('index', { rooms: rooms });
});

app.post('/room', (req, res) => {
  if (rooms[req.body.room] != null) {
    return res.redirect('/');
  }
  rooms[req.body.room] = { users: {} };
  res.redirect(req.body.room);
  // Send message that new room was created
  io.emit('room-created', req.body.room);
});

app.get('/:room', (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect('/');
  }
  res.render('room', { roomName: req.params.room });
});

/**
 * SocketIO
 */

// io.adapter(socketRedisAdapter(pubClient, subClient));
io.adapter(createAdapter());

io.on('connection', socket => {
  socket.on('new-user', (room, name) => {
    socket.join(room);
    rooms[room].users[socket.id] = name;
    socket.to(room).emit('user-connected', name);
  });

  socket.on('send-chat-message', (room, message) => {
    socket.to(room).emit('chat-message', { message: message, name: rooms[room].users[socket.id] });
  });

  socket.on('disconnect', () => {
    getUserRooms(socket).forEach(room => {
      socket.to(room).emit('user-disconnected', rooms[room].users[socket.id]);
      delete rooms[room].users[socket.id];
    });
  });
});

/**
 * Function
 */

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name);
    return names;
  }, []);
}

function getRoomsObject(data) {}

/**
 * Start Server
 */

server.listen(port, () => {
  console.log(`Listening to port 3000, PID: ${process.pid}`);
});
