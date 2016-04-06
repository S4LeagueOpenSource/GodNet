var net = require('net')
var Config = require('./Config')
var EChatPacket = require('../Core/Constants/Packets/EChatPacket')
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
		case EChatPacket.CKeepAliveAck:
			break
		case EChatPacket.CLoginReq:
			Request.handleLoginRequest(packet, session)
			break
		case EChatPacket.CMessageReq:
			Request.handleMessageRequest(packet, session)
			break
		case EChatPacket.CWhisperReq:
			Request.handleWhisperRequest(packet, session)
			break
		case EChatPacket.CChannelListReq:
			Request.handleChannelListRequest(packet, session)
			break
		case EChatPacket.CChannelEnterReq:
			Request.handleChannelEnterRequest(packet, session)
			break
		case EChatPacket.CChannelLeaveReq:
			Request.handleChannelLeaveRequest(packet, session)
			break
		case EChatPacket.CFriendListReq:
			Request.handleFriendListRequest(packet, session)
			break
		case EChatPacket.CFriendUnkReq:
			Request.handleFriendUnkRequest(packet, session)
			break
		case EChatPacket.CCombiListReq:
			Request.handleCombiListRequest(packet, session)
			break
		case EChatPacket.CDenyListReq:
			Request.handleDenyListReq(packet, session)
			break
		case EChatPacket.CGetDataReq:
			Request.handleGetDataRequest(packet, session)
			break
		case EChatPacket.CSetDataReq:
			Request.handleSetDataRequest(packet, session)
			break
		case EChatPacket.CSetStateReq:
			Request.handleSetStateRequest(packet, session)
			break
		case EChatPacket.CAddDenyReq:
			Request.handleAddDenyRequest(packet, session)
			break
		case EChatPacket.CRemoveDenyReq:
			Request.handleRemoveDenyRequest(packet, session)
			break
		case EChatPacket.CAddFriendReq:
			Request.handleAddFriendRequest(packet, session)
			break
		case EChatPacket.CDeleteFriendReq:
			Request.handleDeleteFriendRequest(packet, session)
			break
		case EChatPacket.CBRSFriendNotifyReq:
			Request.handleBRSFriendNotifyRequest(packet, session)
			break
		case EChatPacket.CInviteReq:
			Request.handleInviteRequest(packet, session)
			break
		case EChatPacket.CAddCombiReq:
			Request.handleAddCombiRequest(packet, session)
			break
		case EChatPacket.CBRSCombiNotifyReq:
			Request.handleBRSCombiNotifyRequest(packet, session)
			break
		case EChatPacket.CDeleteCombiReq:
			Request.handleDeleteCombiRequest(packet, session)
			break
		case EChatPacket.CCombiNameReq:
			Request.handleCombiNameRequest(packet, session)
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

global.Cache.name = serverr.name
global.Cache.playerLimit = serverr.limit

server.listen(serverr.port, serverr.ip)

log.info('Server started on ' + serverr.ip + ':' + serverr.port)