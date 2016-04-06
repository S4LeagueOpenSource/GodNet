var Config = require('./Config')
var EChatPacket = require('../Core/Constants/Packets/EChatPacket')
var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')

var log = new Logger('ChannelHandler')

var channels = Cache.channels

function broadcastToChannel(channel_id, packet, exclude) {
	for (var i = 0; i < channels.length; ++i) {
		var channel = channels[i]
		if(channel_id === channel.id) {
			for (var i_ = 0; i_ < channel.players.length; ++i_) {
				var player = channel.players[i_]
				if(player !== exclude) {
					player.write(packet)
				}
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

function getChannelByName(name) {
	for (var i = 0; i < channels.length; ++i) {
		var channel = channels[i]
		if(channel.name === name) {
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
	join: function(session, channel_name) {
		if(session.channel_id) {
			return
		}

		var channel = getChannelByName(channel_name)

		if(!channel) {
			return// session.write(this.ResultAck(EServerResult.NonExistingChannel))
		}

		/*
		// Check if the channel exceeded its player limit
		if(channel.count >= channel.max_players) {
			return// session.write(this.ResultAck(EServerResult.ChannelLimitExceed))
		}

		// Check the level limit
		if(channel.min_level >= session.level && channel.max_level <= session.level) {
			return// session.write(this.ResultAck(EServerResult.CannotEnterChannel))
		}
		*/

		log.debug('Player ' + session.player_id + ' joining Channel #' + channel.id)

		channel.players.push(session)

		channel.count++
		session.channel_id = channel.id

		session.write(Channel.ChannelEnterAck(session.channel_id))
		session.write(Channel.ChannelPlayerListInfoAck(session.channel_id))
		broadcastToChannel(session.channel_id, Channel.ChannelPlayerJoinedAck(session.channel_id, session), session)
	},
	leave: function(session) {
		if(session.channel_id === null) {
			return
		}

		log.debug('Player ' + session.player_id + ' leaving Channel #' + session.channel_id)

		var channel = getChannelByID(session.channel_id)

		channel.players.splice(channel.players.indexOf(session), 1)

		channel.count--
		session.channel_id = null

		broadcastToChannel(channel.id, Channel.ChannelPlayerLeftAck(channel.id, session.player_id))
	},
	writeUserData: function(packet, player, shortVersion) {
		if(!shortVersion) {
			packet.writeUInt64LE(player.player_id)
			packet.writeString(player.player_name, 31)
		}
		packet.writeUInt8(2) // result | 0 -> failed
		packet.writeUInt8(player.gm_level ? 1 : 0)
		packet.writeUInt64LE(player.player_id)
		packet.writeUInt16LE(player.server_id)
		packet.writeInt16LE(player.channel_id ? player.channel_id : -1)
		packet.writeInt32LE(player.room_id ? player.room_id : -1)
		packet.writeUInt8(player.communityByte)
		packet.writeUInt32LE(player.exp)
		packet.writeBuffer(player.stats)
		packet.writeUInt8(player.allowCombiRequest)
		packet.writeUInt8(player.allowFriendRequest)
		packet.writeUInt8(player.allowInvite)
		packet.writeUInt8(player.allowInfoRequest)
		packet.writeBuffer(player.communityData)
	},
	ChannelEnterAck: function(channel_id) {
		log.debug('ChannelEnterAck')

		var packet = new Packet(EChatPacket.SChannelEnterAck)
		packet.writeUInt32LE(channel_id)
		return packet.finalize()
	},
	ChannelPlayerListInfoAck: function(channel_id) {
		log.debug('ChannelPlayerListInfoAck')

		var channel = getChannelByID(channel_id)

		var packet = new Packet(EChatPacket.SChannelPlayerListInfoAck)
        packet.writeUInt32LE(channel.id)
        packet.writeUInt32LE(channel.players.length)

		for (var i = 0; i < channel.players.length; ++i) {
			var player = channel.players[i]
        	Channel.writeUserData(packet, player)
		}
		return packet.finalize()
	},
	ChannelPlayerJoinedAck: function(channel_id, session) {
		log.debug('ChannelPlayerJoinedAck')

		var packet = new Packet(EChatPacket.SChannelPlayerJoinedAck)
		packet.writeUInt32LE(channel_id)
		Channel.writeUserData(packet, session)
		return packet.finalize()
	},
	ChannelPlayerLeftAck: function(channel_id, player_id) {
		log.debug('ChannelPlayerLeftAck')

		var packet = new Packet(EChatPacket.SChannelPlayerLeftAck)
		packet.writeUInt32LE(channel_id)
		packet.writeUInt64LE(player_id)
		return packet.finalize()
	}
}