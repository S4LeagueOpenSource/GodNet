var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')

var EAuthPacket = require('../Core/Constants/Packets/EAuthPacket')
var EChatPacket = require('../Core/Constants/Packets/EChatPacket')
var EGamePacket = require('../Core/Constants/Packets/EGamePacket')
var ERelayPacket = require('../Core/Constants/Packets/ERelayPacket')

var log = new Logger('Ack')

var Ack = module.exports = {
	Auth: function(username, password) {
		var packet = new Packet(EAuthPacket.CAuthReq)

		// username can't be longer than 12 chars
		// Otherwise the S4 Client crashes
		// We use 13 here for already adding the amazing padding added by the s4 client
		packet.writeString(username, 13) // username
		// password can be up to 16 chars... We fill it up to 16 chars
		packet.writeString(password, 16) // password

		return packet.finalize()
	},
	Serverlist: function() {
		var packet = new Packet(EAuthPacket.CLoginReq)

		// S4 client sends more info... But we don't give a fuck here
		// Not needed by my god server implementation atm
		return packet.finalize()
	},
	Login: function(packet_counter) {
		var packet = new Packet(EGamePacket.CLoginReq)
		packet.writeUInt32LE(packet_counter)
		packet.writeString('test', 43)
		packet.writeUInt32LE(session_id)

		packet.encrypt()
		return packet.finalize()
	},
	AdminShowWindowReq: function(packet_counter) {
		var packet = new Packet(EGamePacket.CAdminShowWindowReq)
		packet.writeUInt32LE(packet_counter)

		packet.encrypt()
		return packet.finalize()
	},
	NATInfoReq: function(packet_counter) {
		var packet = new Packet(EGamePacket.CNATInfoReq)
		packet.writeUInt32LE(packet_counter)
		packet.writeUInt32LE(1) // private ip
		packet.writeUInt16LE(1) // private port
		packet.writeUInt32LE(1) // public ip
		packet.writeUInt16LE(1) // public port
		packet.writeUInt16LE(1) // nat unk
		packet.writeUInt8(1) // connection type

		packet.encrypt()
		return packet.finalize()
	},
	ChannelInfoReq: function(type, packet_counter) {
		var packet = new Packet(EGamePacket.CChannelInfoReq)
		packet.writeUInt32LE(packet_counter)
		packet.writeUInt8(type)

		packet.encrypt()
		return packet.finalize()
	},
	AdminActionReq: function(text, packet_counter) {
		var packet = new Packet(EGamePacket.CAdminActionReq)
		packet.writeUInt32LE(packet_counter)
		packet.writeStringNT(text)

		packet.encrypt()
		return packet.finalize()
	},
	Chat: function() {
		var packet = new Packet(EChatPacket.CLoginReq)
		packet.writeUInt64LE(10000)
		packet.writeString('test')

		return packet.finalize()
	},
	Relay: function() {
		var packet = new Packet(ERelayPacket.CLoginReq)
		packet.writeString('test')

		return packet.finalize()
	}
}