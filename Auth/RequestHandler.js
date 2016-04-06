var async = require('../Core/node_modules/async')
var Config = require('./Config')
var EAuthPacket = require('../Core/Constants/Packets/EAuthPacket')
var ELoginResult = require('../Core/Constants/ELoginResult')
var Helper = require('../Core/Utils/Helper')
var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')

var log = new Logger('RequestHandler')

var players = []
var servers = Cache.servers

function addPlayer(session) {
	players.push(session)
}

function removePlayer(session) {
	players.splice(players.indexOf(session), 1)
}

var Request = module.exports = {
	close: function(session) {
		log.debug('Connection closed')
		this.closed(session)
		session.destroy()
	},
	closed: function(session) {
		if(!session.player_id) {
			return
		}
		removePlayer(session)
		db.Server.updateOnline(Config.server_id, -1) // Decrement 1 online player
	},
	handleAuthRequest: function(packet, session) {
		log.debug('CAuthReq')

		var username = packet.readStringNT(13)
		var password = packet.readStringNT(16)
		//var remaining = packet.readRemaining() // unk... Maybe an identifier for the game session...?

		async.series({
			login: function(callback) {
				db.Account.findByLogin(username, function(err, result) {
					if(err) {
						session.write(Request.AuthAck(0, ELoginResult.Failure))
						return callback(err, null)
					}

					if(!result) {
						session.write(Request.AuthAck(0, ELoginResult.AccountError))
						return callback(true, null)
					}

					if(result.password !== password) {
						session.write(Request.AuthAck(0, ELoginResult.AccountError))
						return callback(true, null)
					}

					if(Helper.isAccountBanned(result)) {
						session.write(Request.AuthAck(0, ELoginResult.AccountBlocked))
						return callback(true, null)
					}

					// generate a new session id
					db.Session.save({ account_id: result.id, remoteAddress: session.remoteAddress, localAddress: session.localAddress }, function(err, db_session) {
						if(err) {
							session.write(Request.AuthAck(0, ELoginResult.Failure))
							return callback(true, null)
						}

						session.player_id = result._id
						session.session_id = db_session._id
						session.username = result.login

						addPlayer(session)

						session.write(Request.AuthAck(session.session_id, ELoginResult.OK))
						db.Login.save({ account_id: session.player_id, server_id: Config.server_id })
						db.Server.updateOnline(Config.server_id, 1) // Increment 1 online player
						callback(null, null)
					})
				})
			}
		})
	},
	handleLoginRequest: function(packet, session) {
		log.debug('CLoginReq')

		if(!session.player_id) {
			return
		}

		//var username = packet.readStringNT(13)
		//var password = packet.readStringNT(16)
		//var remaining = packet.readRemaining() // Unk... Maybe a checksum cause it's always the same...?

		db.Session.findByID(session.session_id, function(err, result) {
			if(err) {
				return
			}

			if(!result) {
				return
			}

			result.save(function(err) {
				if(err) {
					return
				}

				session.write(Request.ServerlistAck())
			})
		})
	},
	AuthAck: function(session_id, result) {
		log.debug('AuthAck')

		var packet = new Packet(EAuthPacket.SAuthAck)
		packet.writeUInt32LE(session_id)
		packet.writeUInt64LE(0) // This is just for
		packet.writeUInt32LE(0) // 12 bytes padding
		packet.writeUInt8(result)
		return packet.finalize()
	},
	ServerlistAck: function() {
		log.debug('ServerlistAck')

		var packet = new Packet(EAuthPacket.SServerlistAck)
		packet.writeUInt8(servers.length)

		for (var i = 0; i < servers.length; ++i) {
			var server = servers[i]
			packet.writeUInt16LE(server.group)
			packet.writeUInt8(server.type)
			packet.writeString(server.name, 40)
			packet.writeUInt16LE(server.online)
			packet.writeUInt16LE(server.limit)
			packet.writeIpAddress(server.ip)
			packet.writeUInt16LE(server.port)
		}

		return packet.finalize()
	}
}