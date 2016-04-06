var async = require('../Core/node_modules/async')
var Logger = require('../Core/Utils/Logger')

var log = new Logger('CacheManager')

global.Cache = []

Cache.servers = []
var servers = Cache.servers

async.parallel({
	servers: function(callback) {
		db.Server.findAllAndSortIDAsc(function(err, result) {
			if(err) {
				log.error('Couldn\'t cache Servers - exiting...')
				log.error(err)
				process.exit()
			}

			for (var i = 0; i < result.length; ++i) {
				var server = result[i]
				servers.push({
					id: server._id,
					group: server.group,
					type: server.type,
					online: 0, // TODO: How to handle that shit?
					limit: server.limit,
					ip: server.ip,
					port: server.port,
					name: server.name
				})
			}

			log.info('Cached ' + result.length + ' Servers')
			callback(null, null)
		})
	}
}, function(err) {
	if(err) {
		log.error('An error occured - exiting...')
		log.error(err)
		process.exit()
	}
	process.emit('CacheManagerDone')
})