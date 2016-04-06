var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')
var Ack = require('./Ack')

var Config = require('./Config')
var EChatPacket = require('../Core/Constants/Packets/EChatPacket')

var net = require('net')

var log = new Logger('Chat')

var auth = new net.Socket()

auth.connect(Config.chat.port, Config.chat.ip, function() {
	log.info('Connected to ' + Config.chat.ip + ':' + Config.chat.port)

	var result = Ack.Chat()

	log.debug('Connected to GodNetChat')

	auth.write(result)
})

auth.on('error', function(e) {
	if(e.code == 'ECONNRESET') {
		log.error('Connection abnormally closed')
	} else if(e.code == 'ECONNREFUSED') {
		log.error('Connection refused. ChatServer down?')
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
	    case EChatPacket.SLoginAck:
			log.debug('SLoginAck SUCCESS-')
			var result = packet.readUInt32LE()
			if(result == 0x00) {
				log.info('Login successful')
				process.emit('ChatServerDone')
			}
	        break
		default:
			log.warning('Unknown Packet received: ' + id)
	}
})

auth.on('close', function() {
	log.info('Connection closed')
})