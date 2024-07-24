const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { Blob, atob } = require("buffer");
const multer=require('multer');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'test5',
  password: 'raheel28',
  port: 5432,
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true , limit: '50mb' , parameterLimit:50000}));

app.get('/', (req, res) => {
  res.sendFile('C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\login.html');
});

app.get('/registration.html' ,(req,res) => {
  res.sendFile("C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\registration.html");
})

app.get('/chatperson.html' , (req,res) => {
  res.sendFile("C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\chatperson.html");
})

app.get('/chatroom.html' , (req,res) => {
  res.sendFile("C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\chatroom.html");
})

app.get('/noRoom.html' , (req,res) => {
  res.send("SELECT ROOM !!!");
})

app.get('/getUserName' , async (req,res) => {
  const {user} = req.query;
  const getQuery = `SELECT first_name FROM users_data WHERE first_name = $1`
  const values = [user];
  const result = await pool.query(getQuery, values);
  const name = [];
  for(let i=0; i<result.rowCount ; i++) {
    const username = result.rows[i].first_name;
    name.push(username)
  }
  res.send(name);
})

app.get('/getuser', async (req,res) => {
  const {user} = req.query;
  const getQuery = `SELECT first_name FROM users_data WHERE email = $1`
  const values = [user];
  const result = await pool.query(getQuery, values);
  const name = [];
  for(let i=0; i<result.rowCount ; i++) {
    const username = result.rows[i].first_name;
    name.push(username)
  }
  res.send(name);
})

app.post('/reg', async (req,res) => {
  var first_name = req.body.first_name;
  var last_name = req.body.last_name;
  var gender = req.body.gender;
  var phone_number= req.body.phone_number;
  var email=req.body.email;
  var password=req.body.pass_word;
  const hashedPassword = await bcrypt.hash(password, 10);
  const insertQuery = 'INSERT INTO users_data (first_name, last_name, email, gender, phone_number, pass_word) VALUES ($1, $2, $3, $4, $5, $6)';
  values = [first_name,last_name,email,gender,phone_number,hashedPassword];
  try {
    await pool.query(insertQuery, values);
    res.sendFile("C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\login.html");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Registration failed");
  }

})

app.post('/login', async (req, res) => {
  var email=req.body.email;
  var password=req.body.password;
  const getQuery = 'SELECT email, pass_word FROM users_data WHERE email = $1';
  const values = [email];
  
  try {
    const result = await pool.query(getQuery, values);
    if (result.rows.length === 0) {
      return res.status(401).send("Invalid email");
    }

    const user = result.rows[0];
    const isPasswordMatch = await bcrypt.compare(password, user.pass_word);
    if (isPasswordMatch) {
      res.sendFile(`C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\room.html`);
    } else {
      return res.status(401).send("Invalid password");
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Login failed");
  }
});

let socketInitialized = false;


app.post('/room',(req,res) => {
  const room = req.body.room;
    res.send(room);
    if (!socketInitialized) {
      roomsocket();
      socketInitialized = true;
    }
});
  


app.post('/person', (req,res) => {
  const person=req.body.user;
    res.send(person);
    if (!socketInitialized) {
      personsocket();
      socketInitialized = true;
    }
  
})

function roomsocket() {
io.on('connection',(socket) => {

  socket.on('join', ({room,username}) => {
    const joinMsg = `${username} joined the room`;
    socket.to(room).emit('joinMsg', joinMsg);
  })
  socket.on('room', (room) => {
    socket.join(room);
  })
  socket.on('upload' , ({fileObj, username,room}) => {
    io.to(room).emit('receive' , {fileObj,username})
  })
  socket.on('user-msg',({room,username,message}) => {
    const formattedMsg=`${username} : <b>${message}</b>`;
    io.to(room).emit('message',formattedMsg);
  })
}) 
};

let users={};
let receiver;

function personsocket() {
  io.on('connection',(socket) => {

    socket.on('new' , (username) => {
      users[username] = socket.id;
    })

    socket.on("upload", ({fileObj,username,senderUserName,file_type}) => {
      receiver = users[senderUserName];
      socket.emit('receiveme' , {fileObj,username,file_type});
      socket.to(receiver).emit('receive' , {fileObj,username,file_type}); 
    });

    socket.on('user-msg',({username,message,senderUserName}) => {
      const formattedMsg=`${username} : <b>${message}</b>`;
      const newformattedMsg = `<p style="color:red;">${username} : ${message}<p>`
      receiver = users[senderUserName];
      socket.emit('newmessage',newformattedMsg);
      socket.to(receiver).emit('message',formattedMsg);
    })
  })
}

// api to add person message in database 
app.post('/add', async (req, res) => {
  const username = req.body.username;
  const senderUserName = req.body.senderUserName;
  const message = req.body.message;
  const status = req.body.read;
  const insertQuery = 'INSERT INTO chats (email, mess_age, person, read_status) VALUES ($1, $2, $3, $4)';
  const values = [username , message , senderUserName, status];
  try {
    await pool.query(insertQuery, values);
    res.sendFile("C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\chatperson.html");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("failed");
  }
});

// api to add room message in database 
app.post('/send', async (req, res) => {
  const email = req.body.username;
  const message = req.body.message;
  const room = req.body.room;
  const insertQuery = 'INSERT INTO room_chat (email, mess_age, room) VALUES ($1, $2, $3)';
  const values = [email , message , room];
  try {
    await pool.query(insertQuery, values);
    res.send("C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\chatroom.html");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("failed");
  }
});

// api to get room messages 
app.get('/getroom' ,  async (req,res) => {
  const { room } = req.query;
  if (room == 'ROOM 1') {
    const getQuery = `SELECT email , mess_age , sent_time , base , file_name FROM room_chat WHERE room = $1`;
    values=[room];
    const result = await pool.query(getQuery, values);
    const messages=[];
    for (let i = 0 ; i < result.rowCount ; i++) {
      if(result.rows[i].base == null) {
        const message = {
          'sentTime': result.rows[i].sent_time,
          'sender': result.rows[i].email,
          'text': result.rows[i].mess_age
      };
      messages.push(message);
      }
      else {
        const message = {
          'sentTime': result.rows[i].sent_time,
          'sender': result.rows[i].email,
          'fileName': result.rows[i].file_name,
          'base64': result.rows[i].base
      }
      messages.push(message);
      }
  }

  res.send(messages);
}

else if (room == 'ROOM 2') {
  const getQuery = `SELECT email , mess_age , sent_time , base , file_name FROM room_chat WHERE room = $1`;
    values=[room];
    const result = await pool.query(getQuery, values);
    const messages=[];
    for (let i = 0 ; i < result.rowCount ; i++) {
      if(result.rows[i].base == null) {
        const message = {
          'sentTime': result.rows[i].sent_time,
          'sender': result.rows[i].email,
          'text': result.rows[i].mess_age
      }
      messages.push(message);
      }
      else {
        const message = {
          'sentTime': result.rows[i].sent_time,
          'sender': result.rows[i].email,
          'fileName': result.rows[i].file_name,
          'base64': result.rows[i].base
      }
      messages.push(message);
      }
  }
  res.send(messages);
}

else {
  const getQuery = `SELECT email , mess_age , sent_time , base , file_name FROM room_chat WHERE room = $1`;
    values=[room];
    const result = await pool.query(getQuery, values);
    const messages=[];
    for (let i = 0 ; i < result.rowCount ; i++) {
      if(result.rows[i].base == null) {
        const message = {
          'sentTime': result.rows[i].sent_time,
          'sender': result.rows[i].email,
          'text': result.rows[i].mess_age
      };
      messages.push(message);
      }
      else {
        const message = {
          'sentTime': result.rows[i].sent_time,
          'sender': result.rows[i].email,
          'fileName': result.rows[i].file_name,
          'base64': result.rows[i].base
      };
      messages.push(message);
      }
  }
  res.send(messages);
}
})

// api to get users from database
app.get('/list' , async (req,res) => {
  const {email} = req.query;
  const getQuery = `SELECT first_name,activity FROM users_data WHERE email != $1 ORDER BY id`;
  values = [email];
  const result = await pool.query(getQuery , values);
  const emails = [];
  for (let i=0 ; i < result.rowCount ; i++) {
    const mail = {
      'activity': result.rows[i].activity,
      'name' : result.rows[i].first_name
    };
    emails.push(mail);
  }
  res.send(emails);
})

// api to store file in user database
app.post('/addFile', async (req,res) => {
  let base = req.body.file;
  let fileName = req.body.file_name;
  let email = req.body.email;
  let person = req.body.person;
  let status = req.body.read;
  const insertQuery = 'INSERT INTO chats (email , file_name , base , person , read_status ) VALUES ($1, $2, $3 , $4 , $5 )';
  const values = [email ,fileName, base , person ,status ];
  try {
    await pool.query(insertQuery, values);
    res.sendFile("C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\chatperson.html");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("failed");
  }
})

// api to store file in room database 
app.post('/addFileRoom', async (req,res) => {
  let base = req.body.file;
  let fileName = req.body.file_name;
  let email = req.body.email;
  let room = req.body.room;
  const insertQuery = 'INSERT INTO room_chat (email , file_name , base , room) VALUES ($1, $2, $3 , $4)';
  const values = [email ,fileName, base , room];
  try {
    await pool.query(insertQuery, values);
    res.sendFile("C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\chatperson.html");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("failed");
  }
})

app.put('/update' ,  async(req,res) => {
  const username = req.body.username;
  const senderUserName = req.body.senderUserName;
  const updateQuery = 'UPDATE chats SET read_status = true WHERE email = $2 AND person = $1';
  const values = [username,senderUserName];
  try {
    await pool.query(updateQuery, values);
    res.sendFile("C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\chatperson.html");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("failed");
  }
})

app.get('/getmessages' ,async (req,res) => {
   const { username  , senderUserName} = req.query;
   const getQuery = `
      SELECT email, mess_age, file_name, base, sent_time , read_status , person
      FROM chats
      WHERE (email = $1 AND person = $2) OR (email = $2 AND person = $1)
      ORDER BY sent_time
  `;
   const values = [username,senderUserName];
   const result = await pool.query(getQuery, values);
   const messages=[];
   for(let i  = 0 ; i < result.rowCount ; i++) {
    if (result.rows[i].base == null) {
      const message = {
        'sentTime': result.rows[i].sent_time,
        'sender': result.rows[i].email,
        'text': result.rows[i].mess_age,
        'status' : result.rows[i].read_status,
        'receiver': result.rows[i].person
    };
    messages.push(message);
    }
    else {
      const message = {
        'sentTime': result.rows[i].sent_time,
        'sender': result.rows[i].email,
        'fileName': result.rows[i].file_name,
        'base64': result.rows[i].base,
        'status' : result.rows[i].read_status,
        'receiver': result.rows[i].person
    };
    messages.push(message);
    } 
   }
  res.send(messages);
})

app.put('/connect' , async(req,res) => {
  const username = req.body.username;
  const updateQuery = `UPDATE users_data SET activity = $1 WHERE first_name = $2`
  const values = ['true' , username];
  try {
    await pool.query(updateQuery, values);
    res.sendFile("C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\room.html");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("failed");
  }
})

app.put('/disconnect' , async(req,res) => {
  const username = req.body.username;
  const updateQuery = `UPDATE users_data SET activity = $1 WHERE first_name = $2`
  const values = ['false' , username];
  try {
    await pool.query(updateQuery, values);
    res.sendFile("C:\\Users\\Raheel\\Desktop\\HTML EX\\node js\\room chatting\\room.html");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("failed");
  }
})

server.listen(5000, () => {
  console.log(`Server running on port 5000`);
});
