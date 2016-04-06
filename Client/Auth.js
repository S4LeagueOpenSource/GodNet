var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')
var Ack = require('./Ack')

var Config = require('./Config')
var EAuthPacket = require('../Core/Constants/Packets/EAuthPacket')
var ELoginResult = require('../Core/Constants/ELoginResult')

var net = require('net')

var log = new Logger('Auth')

var auth = new net.Socket()

auth.connect(Config.auth.port, Config.auth.ip, function() {
	log.info('Connected to ' + Config.auth.ip + ':' + Config.auth.port)

	var result = Ack.Auth('test', 'test')

	log.debug('Logging in with Username: test | Password: test')

	auth.write(result)
})

auth.on('error', function(e) {
	if(e.code == 'ECONNRESET') {
		log.error('Connection abnormally closed')
	} else if(e.code == 'ECONNREFUSED') {
		log.error('Connection refused. AuthServer down?')
	} else {
		log.error('Unhandled error occured: ' + e.code)
	}
})

auth.on('data', function(data) {
	var packet = new Packet(data)

	packet.skip(2) //var size = packet.readUInt16LE()
	packet.skip(1) //var unknown = packet.readUInt8()
	var packet_id = packet.readUInt8()

	switch (packet_id) {
	    case EAuthPacket.SServerlistAck:
			log.debug('SServerlistAck SUCCESS-')

			var length = packet.readUInt8()
			log.debug('Servercount: ' + length)
			for(var i = 0; i < length; i++) {
				var id = packet.readUInt16LE()
				var type = packet.readUInt8()
				var name = packet.readStringNT(40)
				var online = packet.readUInt16LE()
				var limit = packet.readUInt16LE()
				//var ip = packet.readUInt8() + '.' + packet.readUInt8() + '.' + packet.readUInt8() + '.' + packet.readUInt8()
				//var port = packet.readUInt16LE()
				if(type == 1) {
					log.debug('Name: ' + name + ' | Online: ' + online + ' | Limit: ' + limit)
				}
	        }
			process.emit('AuthServerDone')
	        break
	    case EAuthPacket.SAuthAck:
			log.debug('SAuthAck SUCCESS-')

			global.session_id = packet.readUInt32LE()
			packet.skip(8)
			var result = packet.readUInt8()
			if(result == ELoginResult.OK) {
				log.info('Login successful - Session ID: ' + session_id)

				auth.write(Ack.Serverlist())
			} else if(result == ELoginResult.AccountError) {
				log.error('Account error')
				auth.destroy()
			} else if(result == ELoginResult.AccountBlocked) {
				log.error('Account blocked')
				auth.destroy()
			} else if(result == ELoginResult.Failure) {
				log.error('Login failed')
				auth.destroy()
			} else {
				log.error('Unkown result received')
				auth.destroy()
			}
	        break
		default:
			log.warning('Unknown Packet received: ' + id)
	}
})

auth.on('close', function() {
	log.info('Connection closed')
})