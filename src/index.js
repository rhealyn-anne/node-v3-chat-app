const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

// let count = 0

//server(emit) -> client (receive) - countUpdated
//client(emit) -> server (receive) - increment

io.on('connection', (socket) => {
    console.log('New Websocket connection');


    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if(error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))         //---> to emit to that particular connection
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))   //--->to emit to everybody BUT that particular connection
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()

        //socket.emit, io.emit, socket.broadcast.emit
        //io.to.emit, socket.broadcast.to.emit
    })


    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if(filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))             //--->to send it to everyone
        callback()
    })

    
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })


    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) { 
        io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        }
    })
    // socket.emit('countUpdated', count)

    // socket.on('increment', () => {
    //     count++
    //     //socket.emit('countUpdated', count)        -->emit event to the specific connection
    //     io.emit('countUpdated', count)              //-->emit event to the every single connection
    // })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`);
})

