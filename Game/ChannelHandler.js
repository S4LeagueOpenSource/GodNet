var Config = require('./Config')
var EGamePacket = require('../Core/Constants/Packets/EGamePacket')
var EServerResult = require('../Core/Constants/EServerResult')
var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')

var log = new Logger('ChannelHandler')

var channels = Cache.channels

function broadcastToChannel(channel_id, packet) {
	for (var i = 0; i < channels.length; ++i) {
		var channel = channels[i]
		if(channel_id === channel.id) {
			for (var i_ = 0; i_ < channel.players.length; ++i_) {
				var player = channel.players[i_]
				player.write(packet)
			}
		}
	}
}

function getChannelByID(id) {
	for (var i = 0; i < channels.length; ++i) {
		var channel = channels[i]
		if(channel.id === id) {
			return channel
		}
	}

	return null
}

process.on('broadcastToChannel', function(channel, packet) {
	broadcastToChannel(channel, packet)
})

var Channel = module.exports = {
	broadcastToChannel: function(channel_id, packet) {
		broadcastToChannel(channel_id, packet)
	},
	join: function(session, id) {
		if(session.channel_id) {
			return
		}

		log.debug('Player ' + session.player_id + ' joining Channel #' + id)

		var channel = getChannelByID(id)
		if(!channel) {
			return session.write(this.ResultAck(EServerResult.NonExistingChannel))
		}

		// Check if the channel exceeded its player limit
		if(channel.count >= channel.max_players) {
			return session.write(this.ResultAck(EServerResult.ChannelLimitExceed))
		}

		// Check the level limit
		if(channel.min_level >= session.level && channel.max_level <= session.level) {
			return session.write(this.ResultAck(EServerResult.CannotEnterChannel))
		}

		channel.players.push(session)

		channel.count++
		session.channel_id = id

		session.write(this.ResultAck(EServerResult.ChannelEnter))
		session.write(this.CashUpdateAck(session.pen, session.ap))
	},
	leave: function(session, type) {
		if(session.channel_id === null) {
			return
		}

		log.debug('Player ' + session.player_id + ' leaving Channel #' + session.channel_id)

		var channel = getChannelByID(session.channel_id)

		channel.players.splice(channel.players.indexOf(session), 1)

		channel.count--
		session.channel_id = null

		if(type === 2) {
			return
		}
		session.write(this.ResultAck(EServerResult.ChannelLeave))
	},
	ChannelInfoAck: function() {
		log.debug('ChannelInfoAck')

		var packet = new Packet(EGamePacket.SChannelInfoAck)

		var length = channels.length
		packet.writeUInt16LE(length)

		for (var i = 0; i < channels.length; ++i) {
			var channel = channels[i]
			packet.writeUInt16LE(channel.id)
			packet.writeUInt16LE(channel.count)
		}

		return packet.finalize()
	},
	CashUpdateAck: function(pen, ap) {
		log.debug('CashUpdateAck')

		var packet = new Packet(EGamePacket.SCashUpdateAck)
		packet.writeUInt32LE(pen)
		packet.writeUInt32LE(ap)
		return packet.finalize()
	},
	ResultAck: function(result) {
		log.debug('ResultAck')

		var packet = new Packet(EGamePacket.SResultAck)
		packet.writeUInt32LE(result)
		return packet.finalize()
	}
}

// PLUGIN STUFF
process.on('ChannelHandler.getAllChannels', function(callback) {
	callback(channels)
})