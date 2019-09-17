var express = require('express')
var app = express()
var fs = require('fs')

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
})

var rooms = [

]
app.get('/rooms/join/:id', (req, res) => {
    // for (let i in rooms) {
    //     if (rooms[i].id === id) {
    //         rooms[i].users
    //     }
    // }
})
app.get('/rooms/list', (req, res) => {
    let avails = []
    for (let i in rooms) {
        if (rooms[i].users.length < 2) {
            avails.push(rooms[i])
        }
    }
    res.end(JSON.stringify(avails))
})
app.get('/', (req, res) => {
    fs.readFile(__dirname + '/' + 'users.json', (err, data) => {
        res.end(data)
    })
})

var server = app.listen(80, () => {
    var host = server.address().address
    var port = server.address().port
    console.log('server running at %s:%s', host, port)
})