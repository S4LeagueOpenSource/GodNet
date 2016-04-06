var Config = require('./Config')
var Logger = require('../../../Core/Utils/Logger')

var log = new Logger('Plugin][WebSocket')

log.info('Starting Server on Port ' + Config.port + '...')

var io = require('../../../Core/node_modules/socket.io').listen(Config.port, { serveClient: false })

process.on('RequestHandler.Player.Join', function(player) {
	log.debug('Player Join - ID: ' + player.player_id)
	io.emit('Player.Join', player.player_id)
})

process.on('RequestHandler.Player.Leave', function(player) {
	log.debug('Player Leave - ID: ' + player.player_id)
	io.emit('Player.Leave', player.player_id)
})

io.on('connection', function(socket) {

	process.emit('WebSocket.Sync', function(result) {
		io.emit('Sync', result)
	})

	//socket.on('disconnect', function() {

	//})
})

log.info('Server is ready for connections')