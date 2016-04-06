var net = require('net')
var Config = require('./Config')
var ERelayPacket = require('../Core/Constants/Packets/ERelayPacket')
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

function parseData(session) {
	while(true) {
		// Get the first bytes
		var size = session.bufferedData.readUInt16LE(0)
		var identifier = session.bufferedData.readUInt8(2)

		// Check identifier
		if(identifier !== 240) {
			session.destroy()
			break
		}

		// Check Size...
		var bufferLength = session.bufferedData.length
		if(size > bufferLength) {
			break // The packet is larger?! oO
		}

		// Extract thingy
		var packet = session.bufferedData.slice(0, size)

		// shrink data
		session.bufferedData = session.bufferedData.slice(size, bufferLength)

		// new packet
		newPacket(packet, session)

		// check if we hit the end with reading from our data buffer
		if(session.bufferedData.length === 0) {
			break // Done reading the buffered data...
		}
	}
}

function newPacket(data, session) {
	var packet = new Packet(data)
	//var size = packet.readUInt16LE()
	//var identifier = packet.readUInt8()
	packet.skip(3)

	var id = packet.readUInt8()

	switch (id) {
	    case ERelayPacket.CLoginReq:
	        Request.handleLoginRequest(packet, session)
	        break
		case ERelayPacket.CJoinTunnelReq:
			Request.handleJoinTunnelRequest(packet, session)
			break
		case ERelayPacket.CLeaveTunnelReq:
			Request.handleLeaveTunnelRequest(packet, session)
			break
		case ERelayPacket.CUseTunnelReq:
			Request.handleUseTunnelRequest(packet, session)
			break
		case ERelayPacket.CDetourPacketReq:
			Request.handleDetourPacketRequest(packet, session)
			break
		case ERelayPacket.CUnknownReq:
			Request.handleCUnknownRequest(packet, session)
			break
		case ERelayPacket.CKeepAliveReq:
			break
		default:
       		log.debug('Unknown Packet: ' + id)
	}
}

var server = net.createServer(function(session) {
	log.debug('Connection opened')

	// Ensure NoDelay (disable Nagle algorithm) everywhere
	session.setNoDelay(true)

	// We only allow IPv4... IPv6 isn't supported by the S4Client.
	if(!net.isIPv4(session.remoteAddress) || !net.isIPv4(session.localAddress)) {
		log.debug('Connection closed - Not IPv4')
		session.destroy()
	}

	session.bufferedData = new Buffer(0)

	session.on('data', function(data) {
		session.bufferedData = Buffer.concat([session.bufferedData, data])
		parseData(session)
	})

	session.on('error', function(e) {
		Request.closed(session)
		if(e.code == 'ECONNRESET') {
			log.debug('Connection closed')
		} else {
			log.error('Unhandled session error occured:')
			log.error(e)
		}
	})

	session.on('end', function() {
		Request.closed(session)
		log.debug('Connection closed')
	})
})

server.on('error', function(e) {
	if(e.code == 'EADDRINUSE') {
		log.error('Port ' + serverr.port + ' already in use - exiting...')
		process.exit()
	} else {
		log.error('Unhandled server error occured:')
		log.error(e)
	}
})

var serverr = getServerByID(Config.server_id)
if(!serverr) {
	log.error('Please configure Server with ID = ' +  Config.server_id + ' - exiting...')
	process.exit()
}

server.listen(serverr.port, serverr.ip)

log.info('Server started on ' + serverr.ip + ':' + serverr.port)