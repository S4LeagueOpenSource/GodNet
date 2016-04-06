var async = require('../Core/node_modules/async')
var Config = require('./Config')
var Logger = require('../Core/Utils/Logger')

var log = new Logger('CacheManager')

global.Cache = []

Cache.channels = []
var channels = Cache.channels

Cache.maps = []
var maps = Cache.maps

Cache.servers = []
var servers = Cache.servers

async.parallel({
	channels: function(callback) {
		db.Channel.findAllAndSortIDAsc(function(err, result) {
			if(err) {
				log.error('Couldn\'t cache Channels - exiting...')
				log.error(err)
				process.exit()
			}

			for (var i = 0; i < result.length; ++i) {
				var channel = result[i]
				channels.push({
					id: channel._id,
					name: channel.name,
					min_level: channel.min_level,
					max_level: channel.max_level,
					max_players: channel.max_players,
					count: 0,
					players: []
				})
			}

			log.info('Cached ' + result.length + ' Channels')
			callback(null, null)
		})
	},
	maps: function(callback) {
		db.Map.findAllAndSortIDAsc(function(err, result) {
			if(err) {
				log.error('Couldn\'t cache Maps - exiting...')
				log.error(err)
				process.exit()
			}

			for (var i = 0; i < result.length; ++i) {
				var map = result[i]
				maps.push({
					id: map._id,
					name: map.name,
					mode: map.mode,
					player_limit: map.player_limit
				})
			}

			log.info('Cached ' + result.length + ' Maps')
			callback(null, null)
		})
	},
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
	},
	// TODO: Should this be in a CacheManager..?
	rooms: function(callback) {
		db.Room.deleteAll(function(err) {
			if(err) {
				log.error('Couldn\'t remove all Rooms - exiting...')
				log.error(err)
				process.exit()
			}

			log.info('Removed all Rooms')
			callback(null, null)
		})
	},
	// TODO: Should this be in a CacheManager..?
	roomplayers: function(callback) {
		db.RoomPlayer.deleteAll(function(err) {
			if(err) {
				log.error('Couldn\'t remove all RoomPlayers - exiting...')
				log.error(err)
				process.exit()
			}

			log.info('Removed all RoomPlayers')
			callback(null, null)
		})
	},
	// TODO: Should this be in a CacheManager..?
	saveOnline: function(callback) {
		db.Server.saveOnline(Config.server_id, 0, function(err) {
			if(err) {
				log.error('Couldn\'t set Server online to 0 - exiting...')
				log.error(err)
				process.exit()
			}

			log.info('Set Server online to 0')
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