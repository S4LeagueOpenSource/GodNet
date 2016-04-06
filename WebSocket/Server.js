var Config = require('./Config')
var Logger = require('../Core/Utils/Logger')

var log = new Logger('Server')
var logGame = new Logger('Server][GameServer')
var logChat = new Logger('Server][ChatServer')
var logWS = new Logger('Server][WebSocket')

var Game = {
	online: false,
	name: '',
	players: {
		online: 0,
		limit: 0
	}
}

var Chat = {
	online: false,
	name: '',
	players: {
		online: 0,
		limit: 0
	}
}

/* Connect to Game Server */
var ioGame = require('../Core/node_modules/socket.io/node_modules/socket.io-client')(Config.game.ip + ':' + Config.game.port)

/* Default Events */
//ioGame.on('connect', function() {

//})

ioGame.on('disconnect', function() {
	// Reset some data...
	Game.online = false
	Game.players.online = 0

	// Sync the data with all clients...
	ioWS.emit('Game.Sync', Game)
})

/* Custom Events */
ioGame.on('Sync', function(data) {
	logGame.debug('Sync')

	// Set the data
	Game.online = data.online
	Game.name = data.name
	Game.players.online = data.players.online
	Game.players.limit = data.players.limit

	// Sync the data with all clients...
	ioWS.emit('Game.Sync', Game)
})

ioGame.on('Player.Join', function(player_id) {
	logGame.debug('Player.Join')
	Game.players.online++
	ioWS.emit('Game.Player.Join', player_id)
})

ioGame.on('Player.Leave', function(player_id) {
	logGame.debug('Player.Leave')
	Game.players.online--
	ioWS.emit('Game.Player.Leave', player_id)
})

/* Connect to Chat Server */
var ioChat = require('../Core/node_modules/socket.io/node_modules/socket.io-client')(Config.chat.ip + ':' + Config.chat.port)

/* Default Events */
//ioChat.on('connect', function() {

//})

ioChat.on('disconnect', function() {
	// Reset some data...
	Chat.online = false
	Chat.players.online = 0

	// Sync the data with all clients...
	ioWS.emit('Chat.Sync', Chat)
})

/* Custom Events */
ioChat.on('Sync', function(data) {
	logChat.debug('Sync')

	// Set the data
	Chat.online = data.online
	Chat.name = data.name
	Chat.players.online = data.players.online
	Chat.players.limit = data.players.limit

	// Sync the data with all clients...
	ioWS.emit('Chat.Sync', Chat)
})

ioChat.on('Player.Join', function(player_id) {
	logChat.debug('Player.Join')
	Chat.players.online++
	ioWS.emit('Chat.Player.Join', player_id)
})

ioChat.on('Player.Leave', function(player_id) {
	logChat.debug('Player.Leave')
	Chat.players.online--
	ioWS.emit('Chat.Player.Leave', player_id)
})

ioChat.on('Message', function(player_id, channel_id, text) {
	logChat.debug('Received Message - Player ID: ' + player_id + ' Channel ID: ' + channel_id + ' Text: ' + text)
	logWS.debug('Send Message - Player ID: ' + player_id + ' Channel ID: ' + channel_id + ' Text: ' + text)
	ioWS.emit('Chat.Message', player_id, channel_id, text)
})

logWS.info('Starting Server on Port ' + Config.port + '...')

var ioWS = require('../Core/node_modules/socket.io').listen(Config.port, { serveClient: false })

ioWS.on('connection', function(socket) {

	socket.emit('Sync', { game: Game, chat: Chat })

	//socket.on('disconnect', function() {

	//)})

	socket.on('Chat.Message', function(player_id, channel_id, text) {
		logWS.debug('Received Message - Player ID: ' + player_id + ' Channel ID: ' + channel_id + ' Text: ' + text)
		logChat.debug('Send Message - Player ID: ' + player_id + ' Channel ID: ' + channel_id + ' Text: ' + text)
		ioChat.emit('Message', player_id, channel_id, text)
	})
})

logWS.info('Server is ready for connections')
