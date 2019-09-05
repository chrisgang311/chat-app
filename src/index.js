const express = require('express')
const Filter = require('bad-words')
const http = require('http')
const socketio = require('socket.io')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

// The express app is created and then passed to http so the socketio can access it
// If express was used directly, there wouldn't be direct access to the server
const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

// Express serves the public directory
app.use(express.static('public'))

let count = 0

// Runs everytime a new connection is established
io.on('connection', (socket) => {
    console.log('New connection')

    // User joins with username and room
    socket.on('join', (options, callback) => {
        const { error, user } =  addUser({ id: socket.id, ...options })
        
        if (error) { 
            return callback(error)
        }

        // Joins a room
        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    // User send message
    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()
        const user = getUser(socket.id)

        if (filter.isProfane(message)) {
            return callback('Watch your profamity!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    // User sends location
    socket.on('sendLocation', (lat, long, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${lat},${long}`))

        callback()
    })

    // User disconnects
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left.`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }  
    })
})

server.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
})