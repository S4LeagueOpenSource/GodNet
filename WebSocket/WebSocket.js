process.title = 'WebSocket'

var Logger = require('../Core/Utils/Logger')

var log = new Logger('Program')

process.on('uncaughtException', function(err) {
	log.error(err.stack)
})

log.info('Starting Server...')

require('./Server')