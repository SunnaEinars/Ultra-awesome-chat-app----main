import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import moment from 'moment';
import mongoose from 'mongoose';

const app = express();
const server = createServer(app);
const io = new Server(server);

// MongoDB Connection Setup
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/Awesome_chat')
  .then(() => console.log('Awesome_chat connected'))
  .catch(err => console.error('Awesome_chat connection error:', err));

// MongoDB Schemas
const MessageSchema = new mongoose.Schema({
  room: String,  // There's only one room
  userName: String,
  message: String,
  time: String
});

const Message = mongoose.model('Message', MessageSchema);
const defaultRoom = 'Everyone';
const usersInRoom = [];

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.use('/static', express.static('static'));
app.use('/js', express.static('js'));

io.on('connection', (socket) => {
  socket.emit('chooseName'); // Prompt the client to choose a name

  socket.on('chooseName', (userName) => {
    socket.userName = userName;
    socket.join(defaultRoom);
    socket.currentRoom = defaultRoom;

    // Fetch the last 50 messages from the database
    Message.find({ room: defaultRoom }).sort({ _id: -1 }).limit().then(messages => {
      messages.reverse(); // Reverse to display in correct chronological order
      socket.emit('chat history', messages.map(msg => ({
        time: msg.time,
        userName: msg.userName,
        message: msg.message
      })));

      if (!usersInRoom.includes(userName)) {
        usersInRoom.push(userName);
      }

      io.to(defaultRoom).emit('update current room', defaultRoom);
      io.to(defaultRoom).emit('updateUserList', usersInRoom);
      io.to(defaultRoom).emit('chat message', `${userName} has joined the room.`);
    }).catch(err => {
      console.error('Error fetching chat history:', err);
    });
  });

  socket.on('disconnect', () => {
    const index = usersInRoom.indexOf(socket.userName);
    if (index !== -1) {
      usersInRoom.splice(index, 1);
    }
    socket.to(defaultRoom).emit('chat message', `${socket.userName} has left the room.`);
  });

  socket.on('chat message', (msg) => {
    const formattedTime = moment().format('HH:mm');
    const messageWithTimestamp = `${formattedTime} - ${socket.userName}: ${msg}`;
    console.log(msg);
    const newMessage = new Message({
      room: defaultRoom,
      userName: socket.userName,
      message: msg,
      time: formattedTime
    });
    newMessage.save().then(() => {
      io.to(defaultRoom).emit('chat message', messageWithTimestamp);
    }).catch(err => {
      console.error('Error saving message:', err);
    });
  });



  socket.on('request user messages', (userName) => {
    Message.find({ userName: userName, room: defaultRoom }).then(messages => {
        socket.emit('user messages', messages.map(msg => ({
            time: msg.time,
            userName: msg.userName,
            message: msg.message
        })));
    }).catch(err => {
        console.error('Error fetching messages for user:', err);
    });
});

socket.on('request all messages', () => {
  Message.find({}).then(messages => {
      socket.emit('chat history', messages.map(msg => ({
          time: msg.time,
          userName: msg.userName,
          message: msg.message
      })));
  }).catch(err => {
      console.error('Error fetching all messages:', err);
  });
});




});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
