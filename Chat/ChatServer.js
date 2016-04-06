process.title = 'ChatServer'

var Logger = require('../Core/Utils/Logger')

var log = new Logger('Program')

process.on('uncaughtException', function(err) {
	log.error(err.stack)
})

log.info('Starting Database...')

global.db = require('../Core/Database/Handler')

require('./CacheManager')

process.on('CacheManagerDone', function() {
	log.info('Starting PluginManager...')

	require('./PluginManager')
})

process.on('PluginManagerDone', function() {
	log.info('Starting Server...')

	require('./Server')
})