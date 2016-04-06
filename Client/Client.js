var Logger = require('../Core/Utils/Logger')
var Ack = require('./Ack')

var Config = require('./Config')

var net = require('net')

var log = new Logger('Client')

log.info('Starting Auth Client...')

require('./Auth')

process.on('AuthServerDone', function() {
	log.info('Starting Game Client...')

	require('./Game')
})

process.on('GameServerDone', function() {
	log.info('Starting Chat Client...')

	require('./Chat')
})

process.on('ChatServerDone', function() {
	log.info('Starting Relay Client...')

	require('./Relay')
})