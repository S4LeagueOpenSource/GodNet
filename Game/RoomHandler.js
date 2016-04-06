var EEquipLimit = require('../Core/Constants/EEquipLimit')
var EGameRule = require('../Core/Constants/EGameRule')
var EGameRuleState = require('../Core/Constants/EGameRuleState')
var EGameTimeState = require('../Core/Constants/EGameTimeState')
var EPlayerEventMessage = require('../Core/Constants/EPlayerEventMessage')
var EPlayerGameMode = require('../Core/Constants/EPlayerGameMode')
var EPlayerState = require('../Core/Constants/EPlayerState')
var EServerResult = require('../Core/Constants/EServerResult')
var ETeam = require('../Core/Constants/ETeam')
var EGamePacket = require('../Core/Constants/Packets/EGamePacket')
var Helper = require('../Core/Utils/Helper')
var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')

var log = new Logger('RoomHandler')

// RoomHandler which checks all rooms every second ;o
setInterval(function() {
	for (var i = 0; i < rooms.length; ++i) {
		var room = rooms[i]
		if(room.state == EGameRuleState.Playing && room.timeState != EGameTimeState.HalfTime) {
			Room.tick(room)
		}
	}
}, 1000)

var maps = Cache.maps
var rooms = []

function broadcastToRoom(channel_id, room_id, packet, exclude) {
	for (var i = 0; i < rooms.length; ++i) {
		var room = rooms[i]
		if(channel_id === room.channel_id && room_id === room.id) {
			for (var i_ = 0; i_ < room.players.length; ++i_) {
				var session = room.players[i_]
				if(exclude !== session) {
					session.write(packet)
				}
			}
			return
		}
	}
}

function getMapByIDAndModeID(id, mode) {
	for (var i = 0; i < maps.length; ++i) {
		var map = maps[i]
		if(map.id === id && map.mode === mode) {
			return map
		}
	}

	return null
}

function getPlayerByRoomAndSlotID(room, slot_id) {
	for (var i = 0; i < room.players.length; ++i) {
		var player = room.players[i]
		if(player.slot_id === slot_id) {
			return player
		}
	}

	return null
}

function getRoomByIDAndChannelID(id, channel_id) {
	for (var i = 0; i < rooms.length; ++i) {
		var room = rooms[i]
		if(room.id === id && room.channel_id === channel_id) {
			return room

		}
	}

	return null
}

function getRoomsByChannelID(channel_id) {
	var found = []

	for (var i = 0; i < rooms.length; ++i) {
		var room = rooms[i]
		if(room.channel_id === channel_id) {
			found.push(room)
		}
	}

	return found
}

function getRoomByTunnelID(id) {
	for (var i = 0; i < rooms.length; ++i) {
		var room = rooms[i]
		if(room.tunnel_id === id) {
			found = room
			return
		}
	}

	return null
}

var Room = module.exports = {
	broadcastToRoom: function(channel_id, room_id, packet, exclude) {
		broadcastToRoom(channel_id, room_id, packet, exclude)
	},
	create: function(room, callback) {
		log.debug('Validate Room #' + room.id)

		if(room.name.length >= 26) {
			log.warning('HAX - Name too long')
			return callback(true)
		}

		var allowedModes = [
			EGameRule.Deathmatch,
			EGameRule.Touchdown,
			EGameRule.Survival
		]

		if(allowedModes.indexOf(room.mode) === -1) {
			log.warning('HAX - Unknown Mode')
			return callback(true)
		}

		/*
		var map = getMapByIDAndModeID(room.map, room.mode)
		if(!map) {
			log.warning('HAX - Room Create MAP: ' + room.map + ' MODE: ' + room.mode)
			return callback(true)
		}
		*/

		if(room.player_limit === 10) {
			room.player_limit = 16
		} else if(room.player_limit === 8) {
			room.player_limit = 12
		} else if(room.player_limit === 7) {
			room.player_limit = 10
		} else if(room.player_limit === 6) {
			room.player_limit = 8
		} else if(room.player_limit === 5) {
			room.player_limit = 6
		} else if(room.player_limit === 3) {
			room.player_limit = 4
		} else if(room.player_limit === 0 && room.mode === EGameRule.Survival) { // Survival
			room.matchKey[2] = 0
			room.player_limit = 1
		} else {
			log.warning('HAX - Unknown Playerlimit ' + room.player_limit + '.')
			return callback(true)
		}

		/*
		if(map.player_limit < room.player_limit) {
			log.warning('HAX - Player Limit is too large: ' + room.player_limit + ' Max limit: ' + map.player_limit)
			return callback(true)
		}
		*/

		if(this.isGMRoom(room)) {
			log.warning('HAX - GMRoom enabled')
			return callback(true)
		}

		if(room.mode === EGameRule.Survival) {
			if(room.observers !== 0) {
				log.warning('HAX - Invalid Observers ' + room.observers + ' for  Survival.')
				return callback(true)
			}
		} else {
			/*
			if(!((map.player_limit - room.player_limit) === room.observers || room.observers === 0)) {
				log.warning('HAX - Invalid Observers ' + room.observers + ' for  ' + room.player_limit + ' Players.')
				return callback(true)
			}
			*/
		}

		var allowedTimeLimits = []
		if(room.mode === EGameRule.Touchdown || room.mode === EGameRule.Deathmatch) {
			allowedTimeLimits = [
				600000, // 10 minutes
				900000, // 15 minutes
				1200000, // 20 minutes
				1800000 // 30 minutes
			]
		} else if(room.mode === EGameRule.Survival) {
			allowedTimeLimits = [
				240000, // 4min (Easy)
				300000, // 5min (Normal)
				360000, // 6min (Hard)
				420000 // 7min (Extreme)
			]
		}

		if(allowedTimeLimits.indexOf(room.time_limit) === -1) {
			log.warning('HAX - Unknown Time Limit ' + room.time_limit + '.')
			return callback(true)
		}

		var allowedScoreLimits = []
		if(room.mode === EGameRule.Touchdown) {
			allowedScoreLimits = [
				10,
				8,
				6,
				4
			]
		} else if(room.mode === EGameRule.Deathmatch) {
			allowedScoreLimits = [
				100,
				80,
				60,
				40
			]
		} else if(room.mode === EGameRule.Survival) {
			allowedScoreLimits = [
				254, // 4min (Easy)
				50, // 5min (Normal)
				75, // 6min (Hard)
				100 // 7min (Extreme)
			]
		}

		if(allowedScoreLimits.indexOf(room.score_limit) === -1) {
			log.warning('HAX - Unknown Score Limit ' + room.score_limit + '.')
			return callback(true)
		}

		var allowedLevelGaps = [
			3,
			5,
			10,
			15,
			20,
			100 // unlimited
		]

		var level_gap = room.max_level - room.min_level
		if(allowedLevelGaps.indexOf(level_gap) === -1) {
			log.warning('HAX - Unknown Level Gap ' + level_gap + '.')
			return callback(true)
		}

		var allowedEquipLimit = [
			EEquipLimit.S4League,
			EEquipLimit.OnlySword
		]

		if(allowedEquipLimit.indexOf(room.equip_limit) === -1) {
			log.warning('HAX - Unknown Equip Limit ' + room.equip_limit)
			return callback(true)
		}

		log.debug('Create Room #' + room.id)

		db.Room.save({ tunnel_id: room.tunnel_id, channel_id: room.channel_id, room_id: room.id, master_id: room.master_id }, function(err) {
			if(err) {
				return callback(true)
			}

			// room score
			room.scoreAlpha = 0
			room.scoreBeta = 0

			// td assist shits
			room.lastAlphaTD = 0
			room.lastAlphaFumbi = 0
			room.lastAlphaFumbiID = 0
			room.lastBetaTD  = 0
			room.lastBetaFumbi = 0
			room.lastBetaFumbiID = 0

			room.beforeResult = 0

			rooms.push(room)

			process.emit('broadcastToChannel', room.channel_id, Room.DeployRoomAck(room))

			callback(false)
		})
	},
	createRoomID: function(channel_id) {
		var id = 1

		while(true) {
			var room = getRoomByIDAndChannelID(id, channel_id)

			if(!room) {
				return id
			}

			id++
		}
	},
	createTunnelID: function() {
		var id = 1

		while(true) {
			var room = getRoomByTunnelID(id)

			if(!room) {
				return id
			}

			id++
		}
	},
	generateUniqueSlotId: function(room) {
		var slot_id = 2

		while(true) {
			var player = getPlayerByRoomAndSlotID(room, slot_id)

			if(!player) {
				return slot_id
			}

			slot_id++
		}
	},
	getRoomByIDAndChannelID: function(id, channel_id) {
		return getRoomByIDAndChannelID(id, channel_id)
	},
	isGMRoom: function(room) {
		return (room.matchKey[0] >> 3) & 1
	},
	setGMRoom: function(room, enabled) {
		if(enabled) {
			room.matchKey[0] = room.matchKey[0] | (1 << 3)
		} else {
			room.matchKey[0] = room.matchKey[0] & ~ (1 << 3)
		}
	},
	calculateEXP: function(room, player) {
		var ts = new Date().getTime() - player.score.joinTime
		if (ts < 0 || player.score.totalPoints === 0) {
			return 0
		}

		switch(room.mode) {
			case EGameRule.Deathmatch:
				return Math.round(ts / 4000 + (player.dm.killPoints * 15) + (100 * player.score.totalPoints / (500 + 2 * player.score.totalPoints) * 14))
			break
			case EGameRule.Touchdown:
				return Math.round(ts / 4000 + (player.td.TDScore * 15) + (100 * player.score.totalPoints / (500 + 2 * player.score.totalPoints) * 14))
			break
			case EGameRule.Survival:
				return 0
			break
		}
	},
	calculatePEN: function(room, player) {
		var ts = new Date().getTime() - player.score.joinTime
		if (ts < 0 || player.score.totalPoints === 0) {
			return 0
		}

		switch(room.mode) {
			case EGameRule.Deathmatch:
				return Math.round(ts / 1000)
			break
			case EGameRule.Touchdown:
				return Math.round(ts / 1000)
			break
			case EGameRule.Survival:
				return Math.round(ts / 1000)
			break
		}
	},
	calculatePing: function(room) {
		return 100
		// TODO: Still bugged...
		// ping calculation percentage shits
		var ping = 0 // reset the ping

		for (var i = 0; i < room.players.length; ++i) {
			var player = room.players[i]
			if(player.player_ping) { // Fix for random game server crash
				ping += player.player_ping // sum up ping from all players
			}
		}

		// no one in the room?
		if(ping === 0) {
			return 100
		}

		ping = ping / room.players.length // divide total ping with players
		ping = (100 - (((ping / 80) * 100) - 100)) // calculate percentage
		ping = ((ping > 100) ? 100 : ping) // finalize percentage

		return ping
	},
	countInTeam: function(room, team, gameMode) {
		var players = room.players

		var count = 0

		if(gameMode) {
			for (var i = 0; i < players.length; ++i) {
				var player = players[i]
				if(player.team === team && player.gameMode === gameMode) {
					count++
				}
			}
		} else {
			for (var i = 0; i < players.length; ++i) {
				var player = players[i]
				if(player.team === team) {
					count++
				}
			}
		}

		return count
	},
	getSpectators: function(room) {
		var spectators = []

		for (var i = 0; i < room.players.length; ++i) {
			var player = room.players[i]
			if(player.gameMode === EPlayerGameMode.Spectate) {
				spectators.push(player)
			}
		}

		return spectators
	},
	getConnectingCount: function(room) {
		var count = 0

		for (var i = 0; i < room.players.length; ++i) {
			var player = room.players[i]
			if(player.isConnecting) {
				count++
			}
		}

		return count
	},
	getWinTeam: function(room) {
		var winTeam = ETeam.Alpha

        if(room.mode === EGameRule.Survival) {
            return winTeam
        }

		if(room.scoreAlpha === room.scoreBeta) {
        	var scoreA = 0
        	var scoreB = 0

			for (var i = 0; i < room.players.length; ++i) {
				var player = room.players[i]
				if(player.state == EPlayerState.Alive) {
					switch(player.team) {
	                	case ETeam.Alpha:
	                    	switch(room.mode) {
	                            case EGameRule.Touchdown:
	                                scoreA += player.score.totalPoints
	                                break
	                            case EGameRule.Deathmatch:
	                                scoreA += player.score.totalPoints
	                                break
	                        }
	                    	break
	                    case ETeam.Beta:
	                        switch(room.mode) {
	                            case EGameRule.Touchdown:
	                                scoreB += player.score.totalPoints
	                                break
	                            case EGameRule.Deathmatch:
	                                scoreB += player.score.totalPoints
	                                break
	                            }
	                        break
	                }
				}
			}

			if(scoreA > scoreB) {
				winTeam = ETeam.Alpha
			} else if(scoreB > scoreA) {
				winTeam = ETeam.Beta
			}


		} else if(room.scoreAlpha > room.scoreBeta) {
			winTeam = ETeam.Alpha
		} else if(room.scoreBeta > room.scoreAlpha) {
			winTeam = ETeam.Beta
		}

    	return winTeam
	},
	join: function(session, id, password, game_mode) {
		log.debug('Player ' + session.player_id + ' joining Room #' + id)

		var room = Room.getRoomByIDAndChannelID(id, session.channel_id)

		if(!room) {
			return session.write(Room.ResultAck(EServerResult.GameServerError))
		}

		// validate the game mode
		var allowedGameModes = [
			0,
			EPlayerGameMode.Normal,
			EPlayerGameMode.Spectate
		]

		if(allowedGameModes.indexOf(game_mode) === -1) {
			log.warning('HAX - Unknown Game Mode ' + game_mode + '.')
			return session.write(Room.ResultAck(EServerResult.GameServerError))
		}

		// Check the level limit
		if(room.min_level >= session.level && room.max_level <= session.level) {
			return Room.ResultAck(EServerResult.ImpossibleToEnterRoom)
		}

		// When the Room is being changed
		// return Room.ResultAck(EServerResult.RoomChangeingRules)

		// check the password
		if (password !== room.password) {
			return session.write(Room.ResultAck(EServerResult.PasswordError))
		}

		// check if we have observers... And Game Mode == 0
		if(room.observers > 0 && game_mode === 0) {
			return session.write(Room.ResultAck(EServerResult.SelectPlayMode))
		}

		// Changing Room Rules
		// return session.write(Room.ResultAck(EServerResult.SelectGameMode))

		// Check if room is full
		if(room.player_limit <= room.players.length) {
			return session.write(Room.ResultAck(EServerResult.RoomAllowedPlayerNumberExceed))
		}

		// When.. I don't know.. Message: "You can't enter the room you've selected."
		// return session.write(Room.ResultAck(EServerResult.FailEnterRoom))

		var slot_id = Room.generateUniqueSlotId(room)

		db.RoomPlayer.save({ channel_id: room.channel_id, room_id: room.id, slot_id: slot_id, player_id: session.player_id }, function(err) {
			if(err) {
				return session.write(Room.ResultAck(EServerResult.GameServerError))
			}

			room.players.push(session)

			session.room_id = id
			session.slot_id = slot_id
			session.state = EPlayerState.Lobby
			session.isConnecting = true

			Room.resetStats(session)

			session.write(Room.EnterRoomSuccessAck(room))
			session.write(Room.IdsInfoAck(session.slot_id, id))

			broadcastToRoom(session.channel_id, session.room_id, Room.PlayerEnteredAck(room))
		})
	},
	leave: function(session, type) {
		log.debug('Player ' + session.player_id + ' leaving Room #' + session.room_id)

		var type_ack

		if(type === 6) { // DC
			type_ack = 0
		} else if(type === 5) { // room close
			type_ack = 5
		} else if(type === 4) { // mod kick
			type_ack = 4
		} else if(type === 3) { // afk
			type_ack = 3
		} else if(type === 2) { // afk
			type_ack = 2
		} else if(type === 1) { // kick
			type_ack = 1
		} else if(type === 0) { // leave
			type_ack = 0
		} else {
			return
		}

		// Needed for the async delay...
		var channel_id = session.channel_id
		var room_id = session.room_id
		var player_id = session.player_id
		var player_name = session.player_name
		var player_slot_id = session.slot_id

		var room = Room.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		db.RoomPlayer.deleteByChannelIDAndRoomIDAndPlayerID(session.channel_id, session.room_id, session.player_id, function(err) {
			if(err) {
				return
			}

			// DC?
			if(type === 6) {
				room.players.splice(room.players.indexOf(session), 1)
			}

			broadcastToRoom(channel_id, room_id, Room.RoomPlayerLeave(player_id, player_name, type_ack))
			broadcastToRoom(channel_id, room_id, Room.PlayerLeaveAck(player_id, player_slot_id))

			// Only when no DC
			if(type !== 6) {
				room.players.splice(room.players.indexOf(session), 1)

				session.room_id = null
				session.slot_id = null
				session.state = EPlayerState.Lobby
				session.team = ETeam.Neutral
				session.gameMode = EPlayerGameMode.Normal
				session.isReady = 0

				if(room.state === EGameRuleState.Playing) { // update stats
					Room.saveStats(session, room.mode, false, false)
				}
			}

			// check if room is empty ;o
			if(room.players.length === 0) {
				return Room.remove(room)
			}

			// check if the master left and not room closed
			if (room.master_id == session.player_id && type !== 5) {
				// The oldest player will get master
				var master = room.players[0]
				Room.setMaster(room, master)
			}

			// Only commented cause of develop purporses
			// Check if we need to go to result
			// TODO: countInTeamPlaying() and testing
			//if(room.state == EGameRuleState.Playing && ( (Room.countInTeam(room, ETeam.Alpha) == 0 || Room.countInTeam(room, ETeam.Beta) == 0) || (Room.countInTeamPlaying(room, ETeam.Alpha) == 0 || Room.countInTeamPlaying(room, ETeam.Beta) == 0) )) {
			//	Room.beginResult(room)
			//}
		})
	},
	remove: function(room) {
		log.debug('Remove Room #' + room.id)

		db.Room.deleteByChannelIDAndRoomID(room.channel_id, room.id, function(err) {
			if(err) {
				return
			}

			rooms.splice(rooms.indexOf(room), 1)

			process.emit('broadcastToChannel', room.channel_id, Room.DisposeRoomAck(room.id))
		})
	},
	leaveAll: function(players) {
		for (var i = 0; i < players.length; i++) {
			Room.leave(players[0], 5)
		}
	},
	quickJoin: function(session, mode) {
		var found = []

		// get all room ids which matches
		for (var i = 0; i < rooms.length; ++i) {
			var player = rooms[i]
			if(room.min_level <= session.level && room.max_level >= session.level && room.publicType === 0 && room.mode === mode) {
				found.push(room.id)
			}
		}

		var length = found.length

		// We found nothing :(
		if(length === 0) {
			return null
		}

		// We found one
		if(length === 1) {
			return found[0]
		}

		// We found multiple... Randomise it ;)
		var rand = Math.floor(Math.random() * length) // Random value

		return found[rand]
	},
	setMaster: function(room, master) {
		db.Room.UpdateMasterIDByChannelIDAndRoomID(room.channel_id, room.id, master.player_id, function(err) {
			if(err) {
				return
			}

			room.master_id = master.player_id

			broadcastToRoom(room.channel_id, room.id, Room.RoomChangeRefereeAck(room.master_id))
			broadcastToRoom(room.channel_id, room.id, Room.RoomChangeMasterAck(room.master_id))

			master.write(Room.NoticeAck('You become the room master.'))
			broadcastToRoom(room.channel_id, room.id, Room.NoticeAck(master.player_name + ' becomes room master.'), master)

			// check if the room is waiting
			if(room.state !== EGameRuleState.Waiting) {
				return
			}

			// fake for master to change the room settings directly
			master.write(Room.RoomChangeStateAck(EGameRuleState.Result))
			master.write(Room.RoomChangeStateAck(EGameRuleState.Waiting))
		})
	},
	changeTimeState: function(room, state) {
		room.timeState = state

		var packet = new Packet(EGamePacket.SRoomChangeSubState)
		packet.writeUInt32LE(state)

		// Check if we are in the halftime
		if(room.timeState == EGameTimeState.HalfTime) {
			// Before halftime 10 seconds...
			var i_count = 10
			for (var i = 0; i < 10; i++) {
				setTimeout(function() {
					broadcastToRoom(room.channel_id, room.id, Room.EventMessageAck(EPlayerEventMessage.HalfTimeIn, 2, 0, 0, (i_count--) + ''))
				}, parseInt(i + '000'))
			}

			// Go to halftime
			setTimeout(function() {
				log.debug('RoomChangeSubState')
				broadcastToRoom(room.channel_id, room.id, packet.finalize())
			}, 10000) // start the halftime in 10 seconds

			// after half time
			setTimeout(function() {
				Room.changeTimeState(room, EGameTimeState.SecondHalf)
				room.roundStartTime = new Date().getTime()
			}, 35000) // 25 seconds half time + 10 before
		} else {
			log.debug('RoomChangeSubState')
			broadcastToRoom(room.channel_id, room.id, packet.finalize())
		}
	},
	changeRoomState: function(room, state) {
		room.state = state

		broadcastToRoom(room.channel_id, room.id, Room.RoomChangeStateAck(state))
	},
	resetStats: function(player) {
		// Overall
		player.score = {
			totalPoints: 0,
			joinTime: 0
		}
		// TD
		player.td = {
			TDScore: 0,
			TDAssist: 0,
			killPoints: 0,
			killAssistPoints: 0,
			defensePoints: 0,
			defenseAssistPoints: 0,
			offensePoints: 0,
			offenseAssistPoints: 0,
			healPoints: 0,
			deaths: 0,
			fumbi: 0
		}
		// DM
		player.dm = {
			killPoints: 0,
			killAssistPoints: 0,
			healPoints: 0,
			deaths: 0
		}
		// Survival
		player.survival = {
			killPoints: 0
		}
	},
	beginRound: function(room) {
		var players = room.players

		for (var i = 0; i < players.length; ++i) {
			var player = players[i]
			if(player.isReady || player.player_id === room.master_id) { // only room master and ready players
				player.state = player.gameMode == EPlayerGameMode.Normal ? EPlayerState.Alive : EPlayerState.Spectating
				player.score.joinTime = new Date().getTime()
				player.isReady = 0
			}
		}

		this.broadcastBriefing(room)

		room.startTime = new Date().getTime()
		room.roundStartTime = new Date().getTime()
		room.TDWaiting = false

		this.changeTimeState(room, EGameTimeState.FirstHalf)
        this.changeRoomState(room, EGameRuleState.Playing)
	},
	beginResult: function(room) {
		if(room.beforeResult) {
			return
		}

		room.beforeResult = 1

		// Before begin result 10 seconds...
		var i_count = 10
		for (var i = 0; i < 10; i++) {
			setTimeout(function() {
				broadcastToRoom(room.channel_id, room.id, Room.EventMessageAck(EPlayerEventMessage.MovingToResultIn, 3, 0, 0, (i_count--) + ''))
			}, parseInt(i + '000'))
		}

		setTimeout(function() {
			Room.currentResult(room)
		}, 10000) // Moving to result in 10 seconds
	},
	currentResult: function(room) {
		Room.changeRoomState(room, EGameRuleState.Result)
		Room.broadcastBriefing(room, true)

		setTimeout(function() {
			Room.endResult(room)

			room.scoreAlpha = 0
			room.scoreBeta = 0
			room.lastAlphaFumbiID = 0
			room.lastBetaFumbiID = 0
		}, 20000) // 20 seconds result screen
	},
	endResult: function(room) {
		for (var i = 0; i < room.players.length; ++i) {
			var player = room.players[i]
			player.state = EPlayerState.Lobby
			Room.resetStats(player)
		}

		room.beforeResult = 0

		this.changeRoomState(room, EGameRuleState.Waiting)
		this.broadcastBriefing(room)
	},
	tick: function(room) {
		// Time Check
		var roundTime = (room.mode == EGameRule.Survival ? room.time_limit : room.time_limit / 2)
		var diff = new Date().getTime() - room.roundStartTime

		if(diff >= roundTime) {
			if(room.mode == EGameRule.Survival) {
				return this.beginResult(room)
			}
			switch(room.timeState) {
				case EGameTimeState.FirstHalf:
					this.changeTimeState(room, EGameTimeState.HalfTime)
				break
				case EGameTimeState.SecondHalf:
					this.beginResult(room)
				break
			}
		}

		// Score Check
		var halfTimeScoreLimit = room.score_limit / 2
		if((room.scoreAlpha >= halfTimeScoreLimit || room.scoreBeta >= halfTimeScoreLimit) && room.timeState == EGameTimeState.FirstHalf) {
			return this.changeTimeState(room, EGameTimeState.HalfTime)
		}

		if((room.scoreAlpha >= room.score_limit || room.scoreBeta >= room.score_limit) && room.timeState == EGameTimeState.SecondHalf) {
			return this.beginResult(room)
		}
	},
	broadcastBriefing: function(room, result) {
		log.debug('RoomBriefingAck')

		var packet = new Packet(EGamePacket.SRoomBriefingAck)

		var winTeam = ETeam.Neutral
		if(result) {
			winTeam = this.getWinTeam(room)
			// save MatchResult
			/*
			db.MatchResult.save({
				channel_id: room.channel_id,
				room_id: room.id,
				mode: room.mode,
				map: room.map,
				winner: winTeam,
				scoreAlpha: room.scoreAlpha,
				scoreBeta: room.scoreBeta
			})
			*/
		}

		packet.writeUInt8(+!!result)
		packet.writeUInt8(0) // event
		packet.writeUInt32LE(winTeam)

		var spectators = Room.getSpectators(room)

		packet.writeUInt32LE(2) // 2 teams
        packet.writeUInt32LE(room.players.length)
    	packet.writeUInt32LE(spectators.length)

		packet.writeUInt8(ETeam.Alpha)
		packet.writeUInt32LE(room.scoreAlpha)
		packet.writeUInt8(ETeam.Beta)
		packet.writeUInt32LE(room.scoreBeta)

		for (var i = 0; i < room.players.length; ++i) {
			var player = room.players[i]
			var pen = 0
			var exp = 0
			var rank_up = 0

			if (result) {
				// Skip players which aren't playing...
				if(player.state === EPlayerState.Lobby || player.state === EPlayerState.Spectating) {
					return
				}
				// calculate exp and pen
				pen = Room.calculatePEN(room, player)
				exp = Room.calculateEXP(room, player)
				// save them
				db.Account.updatePEN(player.player_id, pen)
				db.Account.updateEXP(player.player_id, exp)
				// add them to the player
				player.exp += exp
				player.pen += pen
				// calculate the level to the new exp
				var new_level = Helper.calculateLevel(player.exp).level
				// rank up?
				if(new_level !== player.level) {
					//Room.rankUp(player.level) // TODO
					player.level = new_level
					rank_up = 1
				}
				// update stats
				Room.saveStats(player, room.mode, (player.team == winTeam), true)
            }

			packet.writeUInt64LE(player.player_id)
			packet.writeUInt8(player.team)
			packet.writeUInt8(player.state)
			packet.writeUInt8(player.isReady)
			packet.writeInt32LE(player.gameMode)
			packet.writeUInt32LE(player.score.totalPoints)
			packet.writeUInt32LE(0) // unk
			packet.writeUInt32LE(pen)
			packet.writeUInt32LE(exp)
			packet.writeUInt32LE(player.exp)
			packet.writeUInt8(rank_up) // rank up
			packet.writeUInt32LE(0) // extra exp (+x)
			packet.writeUInt32LE(0) // extra pen (+x)
			packet.writeUInt8(0) // unk
			packet.writeUInt8(0) // unk
			packet.writeUInt8(0) // unk
			packet.writeUInt8(0) // unk
			if(result && room.mode === EGameRule.Survival) {
				packet.writeUInt8(1) // Not sure... But changes it to the real time...
			} else {
				packet.writeUInt8(0)
			}
			packet.writeUInt8(0) // unk
			packet.writeUInt8(0) // unk

            switch (room.mode) {
            	case EGameRule.Touchdown:
                    packet.writeUInt32LE(player.td.TDScore)
                    packet.writeUInt32LE(player.td.killPoints)
                    packet.writeUInt32LE(player.td.killPoints)
                    packet.writeUInt32LE(player.td.killPoints) // kill
                    packet.writeUInt32LE(player.td.defensePoints)
                    packet.writeUInt32LE(player.td.defensePoints)
                    packet.writeUInt32LE(player.td.defensePoints) //defensive
                    packet.writeUInt32LE(player.td.defensePoints) //defensive
                    packet.writeUInt32LE(player.td.healPoints) // heal points
                    packet.writeUInt32LE(0)
                    packet.writeUInt32LE(0)
                    packet.writeUInt32LE(0)
                    packet.writeUInt32LE(player.td.offensePoints) // offense point
                    packet.writeUInt32LE(0)
                    packet.writeUInt32LE(0)
                    break
                case EGameRule.Deathmatch:
                    packet.writeUInt32LE(player.dm.killPoints >> 1) // kill points
                    packet.writeUInt32LE(player.dm.killPoints) // kill assist points
                    packet.writeUInt32LE(player.dm.healPoints) //heal points
                    packet.writeUInt32LE(0)
                    packet.writeUInt32LE(0)
                    packet.writeUInt32LE(0)
                    packet.writeUInt32LE(player.dm.deaths)
                    break
                case EGameRule.Survival:
                    packet.writeUInt32LE(player.survival.killPoints)
                    break
            }
        }

		for (var i = 0; i < spectators.length; ++i) {
			var spectator = spectators[i]
            packet.writeUInt64LE(spectator.player_id)
            packet.writeInt32LE(0)
        }

        broadcastToRoom(room.channel_id, room.id, packet.finalize())
	},
	saveStats: function(player, mode, win, updateScore) {
		if(mode === EGameRule.Survival) {
			return
		}

		player.stats.matches++
		if(win) {
			player.stats.won++
		} else {
			player.stats.lost++
		}

		if(mode === EGameRule.Deathmatch) {
			player.stats.dm.matches++
			if(win) {
				player.stats.dm.won++
			} else {
				player.stats.dm.lost++
			}

			if(updateScore) {
				player.stats.dm.kills += player.dm.killPoints
				player.stats.dm.killAssists += player.dm.killAssistPoints
				player.stats.dm.recovery += player.dm.healPoints
				player.stats.dm.deaths += player.dm.deaths
			}
		} else if(mode === EGameRule.Touchdown) {
			player.stats.td.matches++
			if(win) {
				player.stats.td.won++
			} else {
				player.stats.td.lost++
			}

			if(updateScore) {
				player.stats.td.TDs += player.td.TDScore
				player.stats.td.TDAssists += player.td.TDAssist
				player.stats.td.kills += player.td.killPoints
				player.stats.td.killAssists += player.td.killAssistPoints
				player.stats.td.offense += player.td.offensePoints
				player.stats.td.offenseAssists += player.td.offenseAssistPoints
				player.stats.td.defense += player.td.defensePoints
				player.stats.td.defenseAssists += player.td.defenseAssistPoints
				player.stats.td.recovery += player.td.healPoints
				player.stats.td.deaths += player.td.deaths
				player.stats.td.fumbi += player.td.fumbi
			}
		}

		db.Account.updateStats(player.player_id, player.stats)
	},
	RoomPlayerLeave: function(id, name, reason) {
		log.debug('RoomPlayerLeave')

		var packet = new Packet(EGamePacket.SRoomPlayerLeave)
		packet.writeUInt64LE(id)
		packet.writeString(name, 31)
		packet.writeUInt8(reason)
		return packet.finalize()
	},
	PlayerLeaveAck: function(id, slot) {
		log.debug('PlayerLeaveAck')

		var packet = new Packet(EGamePacket.SPlayerLeaveAck)
		packet.writeUInt64LE(id)
		packet.writeUInt8(slot)
		return packet.finalize()
	},
	DeployRoomAck: function(room) {
		log.debug('DeployRoomAck')

		var packet = new Packet(EGamePacket.SDeployRoomAck)
		packet.writeUInt32LE(room.id)
		packet.writeBuffer(room.matchKey)
		packet.writeUInt8(room.state)
		packet.writeUInt8(room.players.length)
		packet.writeString(room.name, 31)
		packet.writeUInt8(room.publicType)
		packet.writeUInt32LE(room.time_limit)
		packet.writeUInt32LE(room.score_limit)
		packet.writeUInt8(room.is_friendly)
		packet.writeUInt8(room.is_balanced)
		packet.writeUInt8(room.min_level)
		packet.writeUInt8(room.max_level)
		packet.writeUInt8(room.equip_limit)
		packet.writeUInt8(room.is_no_intrusion)
		return packet.finalize()
	},
	DisposeRoomAck: function(id) {
		log.debug('DisposeRoomAck')

		var packet = new Packet(EGamePacket.SDisposeRoomAck)
		packet.writeUInt32LE(id)
		return packet.finalize()
	},
	EnterRoomSuccessAck: function(room) {
		log.debug('EnterRoomSuccessAck')

		var packet = new Packet(EGamePacket.SEnterRoomSuccessAck)
		packet.writeUInt32LE(room.id)
		packet.writeBuffer(room.matchKey)
		packet.writeUInt32LE(room.state)
		packet.writeUInt32LE(room.timeState)
		packet.writeUInt32LE(room.time_limit)
		if(room.state === EGameRuleState.Waiting || room.state === EGameRuleState.Result) {
			packet.writeUInt32LE(0)
		} else {
			var timePassed = new Date().getTime() - room.startTime
			packet.writeUInt32LE(timePassed)
		}
		packet.writeUInt32LE(room.score_limit)
		packet.writeUInt8(room.is_friendly)
		packet.writeUInt8(room.is_balanced)
		packet.writeUInt8(room.min_level)
		packet.writeUInt8(room.max_level)
		packet.writeUInt8(room.equip_limit)
		packet.writeUInt8(room.is_no_intrusion)
		return packet.finalize()
	},
	IdsInfoAck: function(slot, tunnel) {
		log.debug('IdsInfoAck')

		var packet = new Packet(EGamePacket.SIdsInfoAck)
		packet.writeUInt8(slot)
		packet.writeUInt32LE(tunnel)
		packet.writeUInt32LE(0) // unk
		return packet.finalize()
	},
	PlayerEnteredAck: function(room) {
		log.debug('PlayerEnteredAck')

		var players = room.players

		var packet = new Packet(EGamePacket.SPlayerEnteredAck)
		packet.writeUInt8(0) // unk
		packet.writeUInt8(players.length)

		for (var i = 0; i < players.length; ++i) {
			var player = players[i]
			packet.writeUInt32LE(player.player_private_ip)
			packet.writeUInt16LE(player.player_private_port)
			packet.writeIpAddress(player.player_public_ip)
			packet.writeUInt16LE(player.player_public_port)
			packet.writeUInt16LE(player.player_nat_unk)
			packet.writeUInt8(player.player_connection_type) // connection type | 6 = relay TODO: Force Relay here?
			packet.writeUInt64LE(player.player_id)
			packet.writeUInt8(player.slot_id)
			packet.writeUInt32LE(0) // unk
			packet.writeUInt8(1) // unk
			packet.writeString(player.player_name, 31)
		}
		return packet.finalize()
	},
	RoomChangeRefereeAck: function(master) {
		log.debug('RoomChangeRefereeAck')

		var packet = new Packet(EGamePacket.SRoomChangeRefereeAck)
		packet.writeUInt64LE(master)
		return packet.finalize()
	},
	RoomChangeMasterAck: function(master) {
		log.debug('RoomChangeMasterAck')

		var packet = new Packet(EGamePacket.SRoomChangeMasterAck)
		packet.writeUInt64LE(master)
		return packet.finalize()
	},
	RoomChangeStateAck: function(state) {
		log.debug('RoomChangeStateAck')

		var packet = new Packet(EGamePacket.SRoomChangeStateAck)
		packet.writeUInt32LE(state)
		return packet.finalize()
	},
	RoomListAck: function(channel_id) {
		log.debug('RoomListAck')

		var roomList = getRoomsByChannelID(channel_id)

		var packet = new Packet(EGamePacket.SRoomListAck)
		packet.writeUInt16LE(roomList.length)

		for (var i = 0; i < roomList.length; ++i) {
			var room = roomList[i]
			packet.writeUInt32LE(room.id)
			packet.writeUInt8(Room.getConnectingCount(room))
			packet.writeUInt8(room.players.length)
			packet.writeUInt8(room.state)
			packet.writeUInt8(Room.calculatePing(room))
			packet.writeBuffer(room.matchKey)
			packet.writeString(room.name, 31)
			packet.writeUInt8(room.publicType)
			packet.writeUInt32LE(room.time_limit)
			packet.writeUInt32LE(room.score_limit)
			packet.writeUInt8(room.is_friendly)
			packet.writeUInt8(room.is_balanced)
			packet.writeUInt8(room.min_level)
			packet.writeUInt8(room.max_level)
			packet.writeUInt8(room.equip_limit)
			packet.writeUInt8(room.is_no_intrusion)
		}

		return packet.finalize()
	},
	ResultAck: function(result) {
		log.debug('ResultAck')

		var packet = new Packet(EGamePacket.SResultAck)
		packet.writeUInt32LE(result)
		return packet.finalize()
	},
	NoticeAck: function(text) {
		log.debug('NoticeAck')

		var packet = new Packet(EGamePacket.SNoticeAck)
		packet.writeUInt16LE(text.length + 1)
		packet.writeString(text, text.length)
		return packet.finalize()
	},
	EventMessageAck: function(event, id, unk1, unk2, str) {
		log.debug('EventMessageAck')

		var packet = new Packet(EGamePacket.SEventMessageAck)
		packet.writeUInt8(event)
		packet.writeUInt64LE(id)
		packet.writeUInt32LE(unk1)
		packet.writeUInt16LE(unk2)
		packet.writeUInt32LE(str.length)
		if (str.length > 0) {
			packet.writeString(str, str.length)
		}
		return packet.finalize()
	}
}

// PLUGIN STUFF
process.on('RoomHandler.doRoomclose', function(channel_id, room_id, callback) {
	var room = Room.getRoomByIDAndChannelID(room_id, channel_id)
	if(!room) {
		return callback()
	}
	Room.leaveAll(room.players)
	callback()
})

process.on('RoomHandler.getAllRooms', function(callback) {
	callback(rooms)
})

process.on('RoomHandler.getRoomsByChannelID', function(channelID, callback) {
	callback(getRoomsByChannelID(channelID))
})