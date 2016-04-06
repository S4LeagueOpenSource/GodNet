var dgram = require('dgram')
var Config = require('./Config')
var ENATPacket = require('../Core/Constants/Packets/ENATPacket')
var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')
var Request = require('./RequestHandler')

var log = new Logger('Server')

var servers = Cache.servers

function getServerByID(id) {
	for (var i = 0; i < servers.length; ++i) {
		var server = servers[i]
		if(server.id === id) {
			return server
		}
	}

	return null
}

var serverr = getServerByID(Config.server_id)
if(!serverr) {
	log.error('Please configure Server with ID = ' +  Config.server_id + ' - exiting...')
	process.exit()
}

var server = dgram.createSocket('udp4')

server.on('listening', function() {
	log.info('Server started on ' + serverr.ip + ':' + serverr.port)
})

server.on('message', function(data, session) {
	// We only allow IPv4... IPv6 isn't supported by the S4Client.
	if(session.family !== 'IPv4') {
		return log.debug('Message dropped - Not IPv4')
	}

	var packet = new Packet(data)
	while(true) {
		packet.skip(2) //var size = packet.readUInt16LE()
		var unk = packet.readUInt8()

		if(unk !== 240) {
			break // no new packet ;o
		}

		var id = packet.readUInt8()

		switch (id) {
			case ENATPacket.Req1:
				Request.handleReq1Request(packet, session, server)
		        break
			case ENATPacket.Req2:
				Request.handleReq2Request(packet, session, server, server2)
		        break
			case ENATPacket.KeepAlive:
				break
			default:
        		log.debug('Unknown Packet: ' + id)
		}
	}
})

server.on('error', function(e) {
	if(e.code == 'EACCES') {
		log.error('Port ' + serverr.port + ' already in use')
	} else {
		log.error('Unhandled error occured: ' + e.code)
	}
})

server.bind(serverr.port, serverr.ip)

var server2 = dgram.createSocket('udp4')

server2.on('listening', function() {
	log.info('Server started on ' + serverr.ip + ':38917')
})

server2.on('message', function(data, session) {
	// We only allow IPv4... IPv6 isn't supported by the S4Client.
	if(session.family !== 'IPv4') {
		return log.debug('Message dropped - Not IPv4')
	}

	var packet = new Packet(data)
	while(true) {
		packet.skip(2) //var size = packet.readUInt16LE()
		var unk = packet.readUInt8()

		if(unk !== 240) {
			break // no new packet ;o
		}

		var id = packet.readUInt8()

		switch (id) {
			case ENATPacket.Req3:
				Request.handleReq3Request(packet, session, server2)
		        break
			default:
        		log.debug('Unknown Packet: ' + id)
		}
	}
})

server2.on('error', function(e) {
	if(e.code == 'EACCES') {
		log.error('Port 38917 already in use')
	} else {
		log.error('Unhandled error occured: ' + e.code)
	}
})

server2.bind(38917, serverr.ip)