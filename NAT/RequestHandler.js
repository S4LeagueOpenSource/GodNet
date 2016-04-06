var Config = require('./Config')
var ENATPacket = require('../Core/Constants/Packets/ENATPacket')
var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')

var log = new Logger('RequestHandler')

module.exports = {
	handleReq1Request: function(packet, session, server) {
		log.debug('Req1')

		var address = packet.readUInt32LE()
		var port = packet.readUInt16LE()

		log.debug('Ack1')
		packet = new Packet(ENATPacket.Ack1)
		packet.writeUInt32LE(address)
		packet.writeUInt16LE(port)
		packet = packet.finalize()
		server.send(packet, 0, packet.length, session.port, session.address)
	},
	handleReq2Request: function(packet, session, server, server2) {
		log.debug('Req2')

		var address = packet.readUInt32LE()
		var port = packet.readUInt16LE()

		log.debug('Ack2')
		packet = new Packet(ENATPacket.Ack2)
		packet.writeUInt32LE(address)
		packet.writeUInt16LE(port)
		packet = packet.finalize()
		server2.send(packet, 0, packet.length, session.port, session.address)
	},
	handleReq3Request: function(packet, session, server2) {
		log.debug('Req3')

		var address = packet.readUInt32LE()
		var port = packet.readUInt16LE()

		log.debug('Ack3')
		packet = new Packet(ENATPacket.Ack3)
		packet.writeUInt32LE(address)
		packet.writeUInt16LE(port)
		packet = packet.finalize()
		server2.send(packet, 0, packet.length, session.port, session.address)
	}
}