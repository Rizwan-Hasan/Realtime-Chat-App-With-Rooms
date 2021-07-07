const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.NODE_PORT;
const logger = require('morgan');

const server = require('http').Server(app);
const io = require('socket.io')(server, {
  path: '/chatserver',
  cors: require('./cors.config'),
  transports: ['websocket'],
});

const { createAdapter } = require('@socket.io/cluster-adapter');

// Memcached Server
const memjs = require('memjs');
const memcachedClient = memjs.Client.create();

/**
 * Express
 */

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(cors(require('./cors.config')));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Routes

app.get('/', async (req, res) => {
  try {
    const rooms = await getRoomsData();
    res.render('index', {
      rooms: rooms,
    });
  } catch (err) {
    console.error(err);
    res.status(500);
  }
});

app.post('/room', async (req, res) => {
  try {
    let rooms = await getRoomsData();

    if (rooms[req.body.room] != null) {
      return res.redirect('/');
    }

    rooms[req.body.room] = { users: {} };

    updateRoomsData(rooms);

    res.redirect(req.body.room);

    // Send message that new room was created
    io.emit('room-created', req.body.room);
  } catch (err) {
    console.error(err);
    res.status(500);
  }
});

app.get('/:room', async (req, res) => {
  try {
    let rooms = await getRoomsData();

    if (rooms[req.params.room] == null) {
      return res.redirect('/');
    }

    res.render('room', {
      roomName: req.params.room,
    });
  } catch (err) {
    console.error(err);
    res.status(500);
  }
});

/**
 * SocketIO
 */

io.on('connection', async socket => {
  let rooms;

  try {
    rooms = await getRoomsData();
  } catch (err) {
    console.error(err);
    return;
  }

  socket.on('new-user', (room, name) => {
    socket.join(room);
    rooms[room].users[socket.id] = name;
    try {
      updateRoomsData(rooms);
    } catch (err) {
      console.error(err);
      return;
    }
    socket.to(room).emit('user-connected', name);
  });

  socket.on('send-chat-message', async (room, message) => {
    socket.to(room).emit('chat-message', {
      message: message,
      name: rooms[room].users[socket.id],
    });
  });

  socket.on('disconnect', async () => {
    try {
      const roomsList = await getUserRooms(socket);
      roomsList.forEach(async room => {
        let rooms = await getRoomsData();
        socket.to(room).emit('user-disconnected', rooms[room].users[socket.id]);
        delete rooms[room].users[socket.id];
        await updateRoomsData(rooms);
      });
    } catch (err) {
      console.error(err);
    }
  });
});

/**
 * Functions
 */

async function getUserRooms(socket) {
  try {
    const rooms = await getRoomsData();
    return Object.entries(rooms).reduce((names, [name, room]) => {
      if (room.users[socket.id] !== null) names.push(name);
      return names;
    }, []);
  } catch (err) {
    console.error(err);
    return;
  }
}

async function getRoomsData() {
  let rooms;
  try {
    rooms = await memcachedClient.get('rooms');
    rooms = rooms.value;
    if (rooms !== null && rooms !== undefined) {
      rooms = rooms.toString();
      rooms = JSON.parse(rooms);
      return rooms;
    } else {
      rooms = {};
      const done = await updateRoomsData(rooms);
      if (done) return rooms;
      else return;
    }
  } catch (err) {
    console.error(err);
    return;
  }
}

async function updateRoomsData(rooms) {
  try {
    await memcachedClient.set('rooms', JSON.stringify(rooms));
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// Socketio Cluster Adapter
io.adapter(createAdapter());

/**
 * Start Server
 */

server.listen(port, () => {
  console.log(`Listening to port ${port}, PID: ${process.pid}`);
});
