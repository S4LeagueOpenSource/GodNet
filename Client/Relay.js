var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')
var Ack = require('./Ack')

var Config = require('./Config')
var ERelayPacket = require('../Core/Constants/Packets/ERelayPacket')

var net = require('net')

var log = new Logger('Relay')

var auth = new net.Socket()

auth.connect(Config.relay.port, Config.relay.ip, function() {
	log.info('Connected to ' + Config.relay.ip + ':' + Config.relay.port)

	var result = Ack.Relay()

	log.debug('Connected to GodNetRelay')

	auth.write(result)
})

auth.on('error', function(e) {
	if(e.code == 'ECONNRESET') {
		log.error('Connection abnormally closed')
	} else if(e.code == 'ECONNREFUSED') {
		log.error('Connection refused. RelayServer down?')
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
	    case ERelayPacket.SResultAck:
			log.debug('SLoginAck SUCCESS-')
			var result = packet.readUInt32LE()
			if(result == 0x00) {
				log.info('Login successful')
				process.emit('RelayServerDone')
			}
	        break
		default:
			log.warning('Unknown Packet received: ' + id)
	}
})

auth.on('close', function() {
	log.info('Connection closed')
})