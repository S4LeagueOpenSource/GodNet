var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')
var Ack = require('./Ack')

var Config = require('./Config')
var EGamePacket = require('../Core/Constants/Packets/EGamePacket')

var net = require('net')

var log = new Logger('Game')

var auth = new net.Socket()

var packet_counter = 0

auth.connect(Config.game.port, Config.game.ip, function() {
	log.info('Connected to ' + Config.game.ip + ':' + Config.game.port)

	auth.write(Ack.Login(packet_counter))
	handlePacketCounter()

	log.debug('Connected to GodNet')
})

auth.on('error', function(e) {
	if(e.code == 'ECONNRESET') {
		log.error('Connection abnormally closed')
	} else if(e.code == 'ECONNREFUSED') {
		log.error('Connection refused. GameServer down?')
	} else {
		log.error('Unhandled error occured: ' + e.code)
	}
})

auth.on('data', function(data) {
	var packet = new Packet(data)

	packet.skip(2) //var size = packet.readUInt16LE()
	packet.skip(1) //var unknown = packet.readUInt8()
	var id = packet.readUInt8()

	switch (id) {
	    case EGamePacket.SLoginAck:
			log.debug('SLoginAck SUCCESS-')
	        break
	    case EGamePacket.STimeSyncAck:
			log.debug('STimeSyncAck SUCCESS-')
	        break
		case EGamePacket.SLicenseInfoAck:
			log.debug('SLicenseInfoAck SUCCESS-')
			break
		case EGamePacket.SCharSlotInfoAck:
			log.debug('SCharSlotInfoAck SUCCESS-')
			break
		case EGamePacket.SOpenCharInfoAck:
			log.debug('SOpenCharInfoAck SUCCESS-')
			break
		case EGamePacket.SCharEquipInfoAck:
			log.debug('SCharEquipInfoAck SUCCESS-')
			break
		case EGamePacket.SInventoryAck:
			log.debug('SInventoryAck SUCCESS-')
			break
		case EGamePacket.SAdminShowWindowAck:
			log.debug('SAdminShowWindowAck SUCCESS-')
			break
		case EGamePacket.SResultAck:
			log.debug('SResultAck SUCCESS-')
			var result = packet.readUInt32LE()
			if(result == 0x11) {
				log.info('Login successful')

				auth.write(Ack.AdminShowWindowReq(packet_counter))
				handlePacketCounter()

				auth.write(Ack.NATInfoReq(packet_counter))
				handlePacketCounter()

				//auth.write(Ack.ChannelInfoReq(5, packet_counter)) // channel list
				//handlePacketCounter()

				auth.write(Ack.AdminActionReq('/whole_notice GodNet Client is the best!', packet_counter))
				handlePacketCounter()

				process.emit('GameServerDone')
			}
			break
		case EGamePacket.SBeginAccountInfoAck:
			log.debug('SBeginAccountInfoAck SUCCESS-')
			break
		default:
			log.warning('Unknown Packet received: ' + id.toString('16'))
	}
})

auth.on('close', function() {
	log.info('Connection closed')
})

function handlePacketCounter() {
	if(packet_counter === 1) {
		packet_counter++
	}
	packet_counter++
}