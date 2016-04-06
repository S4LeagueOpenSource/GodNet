var express = require('../../../Core/node_modules/express')
var Config = require('./Config')
var Logger = require('../../../Core/Utils/Logger')

var log = new Logger('Plugin][WebAPI')

var app = express()

app.disable('etag')
app.disable('x-powered-by')

app.get('/do/channel/:channel_id/roomclose/:room_id', function (req, res) {
	var channel_id = parseInt(req.params['channel_id'])
	var room_id = parseInt(req.params['room_id'])
	log.debug('/do/channel/' + channel_id + '/roomclose/' + room_id)
	process.emit('RoomHandler.doRoomclose', channel_id, room_id, function() {
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0')
		res.setHeader('Content-Type', 'application/json')

		var result = {
			'success': true
		}

		res.send(result)
	})
})

app.get('/do/kick/:id', function (req, res) {
	var id = parseInt(req.params['id'])
	log.debug('/do/kick/' + id)
	process.emit('RequestHandler.doKick', id, function() {
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0')
		res.setHeader('Content-Type', 'application/json')

		var result = {
			'success': true
		}

		res.send(result)
	})
})

app.get('/do/roomkick/:id', function (req, res) {
	var id = parseInt(req.params['id'])
	log.debug('/do/roomkick/' + id)
	process.emit('RequestHandler.doRoomkick', id, function() {
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0')
		res.setHeader('Content-Type', 'application/json')

		var result = {
			'success': true
		}

		res.send(result)
	})
})

app.get('/get/channels/all', function (req, res) {
	log.debug('/get/server/info')
	process.emit('ChannelHandler.getAllChannels', function(channels) {
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0')
		res.setHeader('Content-Type', 'application/json')

		var result = []

		for (var i = 0; i < channels.length; ++i) {
			var channel = channels[i]
			var item = {
				id: channel.id,
				name: channel.name,
				level: {
					min: channel.min_level,
					max: channel.max_level
				},
				players: {
					online: channel.count,
					limit: channel.max_players
				}
			}

			result.push(item)
		}

		res.send(result)
	})
})

app.get('/get/players/all', function (req, res) {
	log.debug('/get/players/all')
	process.emit('RequestHandler.getPlayersAll', function(players) {
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0')
		res.setHeader('Content-Type', 'application/json')

		var result = []

		players.forEach(function(player) {
			var item = {
				id: player.player_id,
				channel_id: player.channel_id,
				room_id: player.room_id,
				name: player.player_name,
				level: player.level,
				exp: player.exp,
				pen: player.pen,
				ap: player.ap,
				combi_level: player.combi_level,
				combi_points: player.combi_points,
				gm_level: player.gm_level,
				active_char_slot: player.active_char_slot,
				tutorial_completed: player.tutorial_completed,
				characters: player.characters,
				stats: player.stats,
				team: player.team,
				state: player.state,
				isReady: player.isReady,
				gameMode: player.gameMode,
				isConnecting: player.isConnecting,
				ping: player.player_ping,
				last_sync_time: player.player_last_sync_time,
				connection_type: player.player_connection_type
			}

			result.push(item)
		})

		res.send(result)
	})
})

app.get('/get/rooms/all', function (req, res) {
	log.debug('/get/rooms/all')
	process.emit('RoomHandler.getAllRooms', function(rooms) {
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0')
		res.setHeader('Content-Type', 'application/json')

		var result = []

		for (var i = 0; i < rooms.length; ++i) {
			var room = channels[i]
			// room
			var item = {
				channel_id: room.channel_id,
				room_id: room.id,
				name: room.name,
				is_GMRoom: (room.matchKey[0] >> 3) & 1,
				has_pw: +!!room.password,
				player_limit: room.player_limit,
				observer_limit: room.observers,
				players: [],
				map: room.map,
				mode: room.mode,
				time_limit: room.time_limit,
				score_limit: 8,
				is_friendly: room.is_friendly,
				is_balance: room.is_balanced,
				min_level: room.min_level,
				max_level: room.max_level,
				equip_limit: room.equip_limit,
				is_no_intrusion: room.is_no_intrusion,
				state: room.state,
				time_state: room.timeState,
				score: {
					alpha: room.scoreAlpha,
					beta: room.scoreBeta
				},
				ping: room.ping
			}

			// players
			for (var i_ = 0; i_ < room.players.length; ++i_) {
				var player = room.players[i_]
				var plr = {
					id: player.player_id,
					name: player.player_name,
					exp: player.exp,
					pen: player.pen,
					ap: player.ap,
					gm_level: player.gm_level,
					level: player.level,
					team: player.team,
					state: player.state,
					isReady: player.isReady,
					gameMode: player.gameMode,
					score: player.score,
					td: player.td,
					dm: player.dm,
					survival: player.survival,
					ping: player.player_ping
				}
				item.players.push(plr)
			}

			result.push(item)
		}

		res.send(result)
	})
})

app.get('/get/rooms/channel/:channel_id', function (req, res) {
	var channel_id = parseInt(req.params['channel_id'])
	log.debug('/get/rooms/channel/' + channel_id)
	process.emit('RoomHandler.getRoomsByChannelID', channel_id, function(rooms) {
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0')
		res.setHeader('Content-Type', 'application/json')

		var result = []

		for (var i = 0; i < rooms.length; ++i) {
			var room = channels[i]
			// room
			var item = {
				channel_id: room.channel_id,
				room_id: room.id,
				name: room.name,
				is_GMRoom: (room.matchKey[0] >> 3) & 1,
				has_pw: +!!room.password,
				player_limit: room.player_limit,
				observer_limit: room.observers,
				players: [],
				map: room.map,
				mode: room.mode,
				time_limit: room.time_limit,
				score_limit: 8,
				is_friendly: room.is_friendly,
				is_balance: room.is_balanced,
				min_level: room.min_level,
				max_level: room.max_level,
				equip_limit: room.equip_limit,
				is_no_intrusion: room.is_no_intrusion,
				state: room.state,
				time_state: room.timeState,
				score: {
					alpha: room.scoreAlpha,
					beta: room.scoreBeta
				},
				ping: room.ping
			}

			// players
			for (var i = 0; i < room.players.length; ++i) {
				var player = room.players[i]
				var plr = {
					id: player.player_id,
					name: player.player_name,
					exp: player.exp,
					pen: player.pen,
					ap: player.ap,
					gm_level: player.gm_level,
					level: player.level,
					team: player.team,
					state: player.state,
					isReady: player.isReady,
					gameMode: player.gameMode,
					score: player.score,
					td: player.td,
					dm: player.dm,
					survival: player.survival,
					ping: player.player_ping
				}
				item.players.push(plr)
			}

			result.push(item)
		}

		res.send(result)
	})
})

app.get('/get/server/info', function (req, res) {
	log.debug('/get/server/info')
	process.emit('RequestHandler.getServerInfo', function(result) {
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0')
		res.setHeader('Content-Type', 'application/json')

		res.send(result)
	})
})

app.use(function(req, res) {
	res.send([])
})

log.info('Starting Server on Port ' + Config.port + '...')

app.listen(Config.port)

log.info('Server is ready for connections')