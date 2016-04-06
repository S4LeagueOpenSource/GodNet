var net = require('net')
var Config = require('./Config')
var EGamePacket = require('../Core/Constants/Packets/EGamePacket')
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

	packet.decrypt()

	//packet.skip(4) //
	var packet_counter = packet.readUInt32LE()
	if(!Request.validatePacketCounter(packet_counter, session)) {
		session.destroy()
		return
	}

	switch (id) {
	    case EGamePacket.CLoginReq:
			Request.handleLoginRequest(packet, session)
	        break
		case EGamePacket.CCheckNicknameReq:
			Request.handleCheckNicknameRequest(packet, session)
			break
		case EGamePacket.CCreateAccountReq:
			Request.handleCreateAccountRequest(packet, session)
			break
		case EGamePacket.CCreateCharacterReq:
			Request.handleCreateCharacterRequest(packet, session)
			break
		case EGamePacket.CSelectCharacterReq:
			Request.handleSelectCharacterRequest(packet, session)
			break
		case EGamePacket.CDeleteCharacterReq:
			Request.handleDeleteCharacterRequest(packet, session)
			break
		case EGamePacket.CTimeSyncReq:
			Request.handleTimeSyncRequest(packet, session)
			break
		case EGamePacket.CKeepAliveReq:
	        break
		case EGamePacket.CChannelInfoReq:
			Request.handleChannelInfoRequest(packet, session)
			break
		case EGamePacket.CChannelEnterReq:
			Request.handleChannelEnterRequest(packet, session)
			break
		case EGamePacket.CChannelLeaveReq:
			Request.handleChannelLeaveRequest(packet, session)
			break
		case EGamePacket.CGetPlayerInfoReq:
			Request.handleGetPlayerInfoRequest(packet, session)
			break
		case EGamePacket.CNATInfoReq:
			Request.handleNATInfoReq(packet, session)
			break
		case EGamePacket.CBuyItemReq:
			Request.handleBuyItemRequest(packet, session)
			break
		case EGamePacket.CRefundItemReq:
			Request.handleRefundItemRequest(packet, session)
			break
		case EGamePacket.CRepairItemReq:
			Request.handleRepairItemRequest(packet, session)
			break
		case EGamePacket.CRefreshItemsReq:
			Request.handleRefreshItemsRequest(packet, session)
			break
		case EGamePacket.CRefreshEQItemsReq:
			Request.handleRefreshEQItemsRequest(packet, session)
			break
		case EGamePacket.CClearInvalidateItemsReq:
			Request.handleClearInvalidateItemsRequest(packet, session)
			break
		case EGamePacket.CUseItemReq:
			Request.handleUseItemRequest(packet, session)
			break
		case EGamePacket.CRegisterLicenseReq:
			Request.handleRegisterLicenseRequest(packet, session)
			break
		case EGamePacket.CLicenseCompletedReq:
			Request.handleLicenseCompletedRequest(packet, session)
			break
		case EGamePacket.CCreateRoomReq:
			Request.handleCreateRoomRequest(packet, session)
			break
		case EGamePacket.CJoinTunnelReq:
			Request.handleJoinTunnelRequest(packet, session)
			break
		case EGamePacket.SCRoomPlayerEnter:
			Request.handleRoomPlayerEnter(packet, session)
			break
		case EGamePacket.CEnterRoomReq:
			Request.handleEnterRoomRequest(packet, session)
			break
		case EGamePacket.CBeginRoundReq:
			Request.handleBeginRoundRequest(packet, session)
			break
		case EGamePacket.CRoomLeaveReq:
			Request.handleRoomLeaveRequest(packet, session)
			break
		case EGamePacket.CEventMessageReq:
			Request.handleEventMessageRequest(packet, session)
			break
		case EGamePacket.CRoomReadyReq:
			Request.handleRoomReadyRequest(packet, session)
			break
		case EGamePacket.CAdminShowWindowReq:
			Request.handleAdminShowWindowRequest(packet, session)
			break
		case EGamePacket.CAdminActionReq:
			Request.handleAdminActionRequest(packet, session)
			break
		case EGamePacket.CScoreKillReq:
			Request.handleScoreKillRequest(packet, session)
			break
		case EGamePacket.SScoreKillAssistReq:
			Request.handleScoreKillAssistRequest(packet, session)
			break
		case EGamePacket.CReboundFumbiReq:
			Request.handleReboundFumbiRequest(packet, session)
			break
		case EGamePacket.SCTouchdown:
			Request.handleTouchdown(packet, session)
			break
		case EGamePacket.CScoreSuicideReq:
			Request.handleScoreSuicideRequest(packet, session)
			break
		case EGamePacket.CScoreOffenseReq:
			Request.handleScoreOffenseRequest(packet, session)
			break
		case EGamePacket.CScoreOffenseAssistReq:
			Request.handleScoreOffenseAssistRequest(packet, session)
			break
		case EGamePacket.CScoreDefenseReq:
			Request.handleScoreDefenseRequest(packet, session)
			break
		case EGamePacket.CScoreDefenseAssistReq:
			Request.handleScoreDefenseAssistRequest(packet, session)
			break
		case EGamePacket.CScoreHealReq:
			Request.handleScoreHealRequest(packet, session)
			break
		case EGamePacket.CChangeTeamReq:
			Request.handleChangeTeamRequest(packet, session)
			break
		case EGamePacket.CRoomKickReq:
			Request.handleRoomKickRequest(packet, session)
			break
		case EGamePacket.CRandomshopReq:
			Request.handleRandomshopRequest(packet, session)
			break
		case EGamePacket.CLogoutReq:
			Request.handleLogoutRequest(packet, session)
			break
		case EGamePacket.CRoomChangeItemsReq:
			Request.handleRoomChangeItemsRequest(packet, session)
			break
		case EGamePacket.CAvatarChangeReq:
			Request.handleAvatarChangeRequest(packet, session)
			break
		case EGamePacket.CChangeRoomReq:
			Request.handleChangeRoomRequest(packet, session)
			break
		case EGamePacket.CRoomPlayerGameModeChangeReq:
			Request.handleRoomPlayerGameModeChangeRequest(packet, session)
			break
		case EGamePacket.CTutorialCompletedReq:
			Request.handleTutorialCompletedRequest(packet, session)
			break
		case EGamePacket.CScoreSurvivalReq:
			Request.handleScoreSurvivalRequest(packet, session)
			break
		case EGamePacket.CQuickJoinReq:
			Request.handleQuickJoinRequest(packet, session)
			break
		case EGamePacket.SCRoomMovePlayer:
			Request.handleRoomMovePlayerRequest(packet, session)
			break
		case EGamePacket.CRoomShuffleReq:
			Request.handleRoomShuffleRequest(packet, session)
			break
		case EGamePacket.CScoreSentryReq:
			Request.handleScoreSentryRequest(packet, session)
			break
		case EGamePacket.CChangeRoomSettingsReq:
			Request.handleChangeRoomSettingsRequest(packet, session)
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
	session.packet_counter = 0

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