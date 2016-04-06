var fs = require('fs')
var async = require('../Core/node_modules/async')
var Logger = require('../Core/Utils/Logger')

var log = new Logger('PluginManager')

async.parallel({
	load: function(callback) {
		fs.readdir('./Plugins', function(err, list) {
			if(err) {
				log.error(err)
			}

			var pluginsLoaded = 0

			list.forEach(function(plugin) {
				try {
					var config = require('./Plugins/' + plugin + '/package.json')
					if(config.load === 'true') {
						require('./Plugins/' + plugin + '/')
						log.info(plugin + ' loaded')
						pluginsLoaded++
					} else {
						log.info(plugin + ' skipped. "load" not defined in package.json or false.')
					}
				} catch(e) {
					log.warning(plugin + ' failed to load. ' + e)
				}
			})

			log.info(pluginsLoaded + ' Plugins loaded')

			callback(null, null)
		})
	}
}, function(err) {
	if(err) {
		log.error('An error occured - exiting...')
		log.error(err)
		process.exit()
	}

	process.emit('PluginManagerDone')
})