var Config = require('./Config')
var ERelayResult = require('../Core/Constants/ERelayResult')
var EP2PPacket = require('../Core/Constants/Packets/EP2PPacket')
var ERelayPacket = require('../Core/Constants/Packets/ERelayPacket')
var Helper = require('../Core/Utils/Helper')
var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')

var log = new Logger('RequestHandler')

var players = []

function broadcastToTunnel(tunnel, packet) {
	for (var i = 0; i < players.length; ++i) {
		var session = players[i]
		if(tunnel === session.tunnel_id) {
			session.write(packet)
		}
	}
}

function broadcastToTunnelAndNeedsRelay(tunnel, packet) {
	for (var i = 0; i < players.length; ++i) {
		var session = players[i]
		if(tunnel === session.tunnel_id && session.needsRelay) {
			session.write(packet)
		}
	}
}

function getPlayerByID(id) {
	for (var i = 0; i < players.length; ++i) {
		var session = players[i]
		if(session.player_id === id) {
			return session
		}
	}

	return null
}

function addPlayer(session) {
	players.push(session)
}

function removePlayer(session) {
	players.splice(players.indexOf(session), 1)
}

var Request = module.exports = {
	close: function(session) {
		log.debug('Connection closed')
		session.destroy()
		this.closed(session)
	},
	closed: function(session) {
		if(!session.player_id) {
			return
		}
		removePlayer(session)
		db.Server.updateOnline(Config.server_id, -1) // Decrement 1 online player
	},
	handleLoginRequest: function(packet, session) {
		log.debug('CLoginReq')

		if(session.player_id) {
			return
		}

		var name = packet.readStringNT()

		db.Account.findByNickname(name, function(err, account) {
			if(err) {
				return session.write(Request.ResultAck(ERelayResult.LoginFailed))
			}

			if(!account) {
				return session.write(Request.ResultAck(ERelayResult.LoginFailed))
			}

			if(Helper.isAccountBanned(account)) {
				return session.write(Request.ResultAck(ERelayResult.LoginFailed))
			}

			db.Session.findByAccountID(account.id, function(err, result) {
				if(err) {
					return session.write(Request.ResultAck(ERelayResult.LoginFailed))
				}

				if(!result) {
					return session.write(Request.ResultAck(ERelayResult.LoginFailed))
				}

				if(!Helper.validateSession(result, session)) {
					return session.write(Request.ResultAck(ERelayResult.LoginFailed))
				}

				// Check if Account is already online
				var target = getPlayerByID(result._id)
				if(target) {
					return session.write(this.ResultAck(1))
				}

				session.player_id = account._id
				session.player_name = account.nickname

				addPlayer(session)

				session.write(Request.ResultAck(ERelayResult.LoginSuccess))

				db.Login.save({ account_id: result.account_id, server_id: Config.server_id })
				db.Server.updateOnline(Config.server_id, 1) // Increment 1 online player
			})
		})
	},
	handleJoinTunnelRequest: function(packet, session) {
		log.debug('CJoinTunnelReq') // Is always sent when a player joins a room

		if(!session.player_id) {
			return
		}

		var tunnel_id = packet.readUInt32LE()
		var slot_id = packet.readUInt8()

		if(session.tunnel_id) {
			return
		}

		session.tunnel_id = tunnel_id
		session.slot_id = slot_id
		session.needsRelay = null

		session.write(this.ResultAck(ERelayResult.JoinTunnelSuccess))
	},
	handleLeaveTunnelRequest: function(packet, session) {
		log.debug('CLeaveTunnelReq') // Is always sent when a player leaves a room

		if(!session.player_id) {
			return
		}

		if(!session.tunnel_id) {
			return
		}

		session.tunnel_id = null
		session.needsRelay = null

		session.write(this.ResultAck(ERelayResult.LeaveTunnelSuccess))
	},
	handleUseTunnelRequest: function(packet, session) {
		log.debug('CUseTunnelReq') // Is only used when the player needs a relay tunnel... E.G. connection_type = 6

		if(!session.player_id) {
			return
		}

		var slot_id = packet.readUInt8()

		if(slot_id === 1) {
			return
		}

		session.needsRelay = 1

		session.write(this.UseTunnelAck(slot_id))
	},
	handleDetourPacketRequest: function(packet, session) {
		//log.debug('CDetourPacketReq')

		if(!session.player_id) {
			return
		}

		packet.skip(4) //var unk = packet.readUInt32LE()

		if(!session.tunnel_id) {
			return
		}

		var p2pPacketLen = packet.readUInt16LE()
		var p2pData = packet.readBuffer(p2pPacketLen)

		var a = new Packet(p2pData) // parse the p2p data
		a.skip(8) // skip some shits
		var id = a.readUInt8()

		if(id == EP2PPacket.PLAYER_SPAWN_REQ || id == EP2PPacket.PLAYER_SPAWN_ACK) {
			broadcastToTunnel(session.tunnel_id, this.DetourPacketAck(p2pData)) // Broadcast that to all players
			return this.parseP2PPacket(p2pData, session)
		}

		if(session.needsRelay) { // Relay player?
			broadcastToTunnel(session.tunnel_id, this.DetourPacketAck(p2pData)) // Broadcast to all players in the room
		} else {
			broadcastToTunnelAndNeedsRelay(session.tunnel_id, this.DetourPacketAck(p2pData)) // Broadcast only to all players which needs relay
		}

		this.parseP2PPacket(p2pData, session)
	},
	handleCUnknownRequest: function(packet, session) {
		log.debug('CUnknownReq from: ' + session.player_name)

		// TODO...

		//if(!session.player_id) {
		//	return
		//}

		//if(!session.tunnel_id) {
		//	return
		//}

		//var data = packet.readRemaining()

		//log.debug('UnknownAck')

		//var packet = new Packet(ERelayPacket.SUnknownAck)
		//packet.writeBuffer(data)
		//broadcastToTunnel(session.tunnel_id, packet.finalize())
	},
	ResultAck: function(result) {
		log.debug('ResultAck')

		var packet = new Packet(ERelayPacket.SResultAck)
		packet.writeUInt32LE(result)
		return packet.finalize()
	},
	UseTunnelAck: function(slot_id) {
		log.debug('UseTunnelAck')

		var packet = new Packet(ERelayPacket.SUseTunnelAck)
		packet.writeUInt8(slot_id)
		return packet.finalize()
	},
	DetourPacketAck: function(p2pData) {
		// log.debug('DetourPacketAck')

		var packet = new Packet(ERelayPacket.SDetourPacketAck)
		packet.writeUInt8(0)
		packet.writeBuffer(p2pData)
		return packet.finalize()
	},
	parseP2PPacket: function(data, session) {
		var packet = new Packet(data)
		packet.skip(2) //var port = packet.readUInt16LE()
		packet.skip(4) //var ip = packet.readUInt32LE()
		packet.skip(2) //var unk = packet.readUInt16LE()
		var id = packet.readUInt8()
		packet.skip(1) //var slot = packet.readUInt8()
		packet.skip(2) //var size = packet.readUInt16LE()

		if(id == EP2PPacket.PLAYER_SPAWN_REQ) {// || id == EP2PPacket.PLAYER_SPAWN_ACK) {
			//log.debug('ID: ' + id + ' Data: ' + packet.readRemaining().toString('hex'), true)
		}

		//return

		switch (id) {
			case EP2PPacket.KEEP_ALIVE_REQ:
				// Keep alive shits...
				//log.debug('P2PPacket KEEP_ALIVE_REQ')
				break
			case EP2PPacket.KEEP_ALIVE_ACK:
				// Keep alive shits..
				//log.debug('P2PPacket KEEP_ALIVE_ACK')
				break
			case EP2PPacket.PLAYER_SPAWN_REQ:
				// When a player joins the room
				//log.debug('P2PPacket PLAYER_SPAWN_REQ')

				//Request.checkIDMHack(packet, session)
				break
			case EP2PPacket.PLAYER_SPAWN_ACK:
				// When a player joins the room
				//log.debug('P2PPacket PLAYER_SPAWN_ACK')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_DAMAGE:
				// packet will be sent when a player got hit... Dmg calculation is on clientside..
				//var unk = packet.readUInt16LE()
				//var type = packet.readUInt8()

				//var weapon = Helper.getWeaponByDamageType(type)

				//log.debug('P2PPacket PLAYER_DAMAGE UNK: ' + unk + ' Type: ' + weapon.name)

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_PUSH_WALL:
				// Player got pushed against a wall
				//log.debug('P2PPacket PLAYER_PUSH_WALL')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_PUSH_BOTTOM:
				// Player got pushed to the ground
				//log.debug('P2PPacket PLAYER_PUSH_BOTTOM')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_PUSH_FLY:
				// Player got pushed and flies... -> Sword or rail / canno
				//log.debug('P2PPacket PLAYER_PUSH_FLY')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_PUSH_MOVE:
				// Player got pushed -> Revo for example
				//log.debug('P2PPacket PLAYER_PUSH_MOVE')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_STUN:
				// Player got stunned
				//log.debug('P2PPacket PLAYER_STUN')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_MIND_WEAPON:
				// Mind weapon used
				//log.debug('P2PPacket PLAYER_MIND_WEAPON')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_INSTALL_WEAPON:
				// A weapon got installed
				//log.debug('P2PPacket PLAYER_INSTALL_WEAPON')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_POSITION:
				// Sends the player position
				/*
				var time = packet.readUInt32LE()
				var x = packet.readFloatLE()
				var y = packet.readFloatLE()
				var z = packet.readFloatLE()
				*/

				//log.debug('P2PPacket PLAYER_POSITION NAME: ' + session.player_name)
				//log.debug('Position - X ' + x + ' Y: ' + y + ' Z: ' + z)
				break
			case EP2PPacket.PLAYER_ANIMATION_STATE:
				// Used when jumping, sit, do animations... everything will pe populated here which is animated
				//log.debug('P2PPacket PLAYER_ANIMATION_STATE')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_FLY:
				// Player used fly
				//log.debug('P2PPacket PLAYER_FLY')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.FUMBI_POSITION:
				// Position from the fumbi
				//log.debug('P2PPacket FUMBI_POSITION')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.ROUND_START:
				// When the round is beginning
				//log.debug('P2PPacket 0x0E')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_OBJECT_DESTROYED:
				// A respawned object got destroyed
				//log.debug('P2PPacket PLAYER_OBJECT_DESTROYED')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_OBJECT_RESPAWNED:
				// A destroyed object got respawned
				//log.debug('P2PPacket 0x1A')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_MIND_WEAPON2:
				// A player is using Mind Energy / Mind Shock
				//log.debug('P2PPacket 0x1B')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_INSTALL_WEAPON2:
				// A player installed a sentry gun / senty nell or it is ready?!
				//log.debug('P2PPacket 0x20')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_INSTALL_WEAPON3:
				// Something related to sentry gun / senty nell
				//log.debug('P2PPacket 0x21')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_USE_GUN:
				// When the player uses a gun
				//log.debug('P2PPacket 0x26')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_ONOFF:
				// Used for player freeze (bind)
				//log.debug('P2PPacket PLAYER_ONOFF')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_BIND_PROPERTIES:
				// Bind shits
				//log.debug('P2PPacket PLAYER_BIND_PROPERTIES')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_BIND_ANIMATION:
				// Animation shit from bind
				//log.debug('P2PPacket PLAYER_BIND_ANIMATION')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.MINEGUN_SHITS1:
				// Unk
				//log.debug('P2PPacket MINEGUN_SHITS1')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.MINEGUN_SHITS2:
				// Unk
				//log.debug('P2PPacket MINEGUN_SHITS2')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.MINEGUN_SHITS3:
				// Unk
				//log.debug('P2PPacket MINEGUN_SHITS3')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_MESSAGE:
				// Used for chat messages in the room
				var type = packet.readUInt8()
				var player_id = packet.readUInt64LE()
				packet.skip(6) // unk
				var textSize = packet.readUInt16LE()
				var text = packet.readString(textSize)

				var type_debug
				if(type === 13) {
					type = 1
					type_debug = 'All'
				} else if(type === 14) {
					type = 2
					type_debug = 'Team'
				} else {
					// Hacker?
				}

				//log.debug('P2PPacket PLAYER_MESSAGE Type: ' + type_debug + ' Player ID: ' + player_id + ' Msg: ' + text)

				if(player_id !== session.player_id) {
					log.warning('Message Hack detected from Player ' + session.player_name + '!')
					return Request.close(session)
					// TODO: Also ban the player?
				}

				// TODO: Also save correct channel and room... Can be accomplished with the Tunnel ID and MongoDB ;) ... We don't support Relay in the future?! So useless.
				db.MessageRoom.save({ account_id: session.player_id, channel_id: 1, room_id: 1, type: type, text: text })
				break
			case EP2PPacket.PLAYER_JOIN:
				// When a player joins?
				//log.debug('P2PPacket 0x31')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_WALL_DESTROYED:
				// A wall got destroyed
				//log.debug('P2PPacket PLAYER_WALL_DESTROYED')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_WALL:
				// Player built a wall
				//log.debug('P2PPacket PLAYER_WALL')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.FUMBI_REBOUND:
				// When a player acquires or lost the fumbi... Also for reset used
				//log.debug('P2PPacket FUMBI_REBOUND')

				//console.log(packet.readRemaining())
				break
			case EP2PPacket.PLAYER_DOES_DAMAGE:
				// When the player does damage
				//log.debug('P2PPacket 0x34')

				//console.log(packet.readRemaining())
				break
			default:
        		log.warning('Unknown P2PPacket: ' + id.toString(16))
		}
	},
	// TODO: Rewrite that shit and check with slots...
	checkIDMHack: function(packet, session) {
		var checks = {}
		// TODO: Bugged with default clothes and crashes because of default ids...
		packet.skip(19) // skip S4 trash
		checks.head_category = packet.readUInt8()
		checks.head_sub_category = packet.readUInt8()
		checks.head_item_id = packet.readUInt16LE()
		checks.face_category = packet.readUInt8()
		checks.face_sub_category = packet.readUInt8()
		checks.face_item_id = packet.readUInt16LE()
		checks.shirt_category = packet.readUInt8()
		checks.shirt_sub_category = packet.readUInt8()
		checks.shirt_item_id = packet.readUInt16LE()
		checks.pants_category = packet.readUInt8()
		checks.pants_sub_category = packet.readUInt8()
		checks.pants_item_id = packet.readUInt16LE()
		checks.gloves_category = packet.readUInt8()
		checks.gloves_sub_category = packet.readUInt8()
		checks.gloves_item_id = packet.readUInt16LE()
		checks.shoes_category = packet.readUInt8()
		checks.shoes_sub_category = packet.readUInt8()
		checks.shoes_item_id = packet.readUInt16LE()
		checks.special_category = packet.readUInt8()
		checks.special_sub_category = packet.readUInt8()
		checks.special_item_id = packet.readUInt16LE()
		checks.skill_category = packet.readUInt8()
		checks.skill_sub_category = packet.readUInt8()
		checks.skill_item_id = packet.readUInt16LE()
		packet.skip(4) // skill2
		checks.weapon_1_category = packet.readUInt8()
		checks.weapon_1_sub_category = packet.readUInt8()
		checks.weapon_1_item_id = packet.readUInt16LE()
		checks.weapon_2_category = packet.readUInt8()
		checks.weapon_2_sub_category = packet.readUInt8()
		checks.weapon_2_item_id = packet.readUInt16LE()
		checks.weapon_3_category = packet.readUInt8()
		checks.weapon_3_sub_category = packet.readUInt8()
		checks.weapon_3_item_id = packet.readUInt16LE()

		log.debug('[IDM Check] Head - Category: ' + checks.head_category + ' | Sub Category: ' + checks.head_sub_category + ' | Item ID: ' + checks.head_item_id)
		log.debug('[IDM Check] Face - Category: ' + checks.face_category + ' | Sub Category: ' + checks.face_sub_category + ' | Item ID: ' + checks.face_item_id)
		log.debug('[IDM Check] Shirt - Category: ' + checks.shirt_category + ' | Sub Category: ' + checks.shirt_sub_category + ' | Item ID: ' + checks.shirt_item_id)
		log.debug('[IDM Check] Pants - Category: ' + checks.pants_category + ' | Sub Category: ' + checks.pants_sub_category + ' | Item ID: ' + checks.pants_item_id)
		log.debug('[IDM Check] Gloves - Category: ' + checks.gloves_category + ' | Sub Category: ' + checks.gloves_sub_category + ' | Item ID: ' + checks.gloves_item_id)
		log.debug('[IDM Check] Shoes - Category: ' + checks.shoes_category + ' | Sub Category: ' + checks.shoes_sub_category + ' | Item ID: ' + checks.shoes_item_id)
		log.debug('[IDM Check] Special - Category: ' + checks.special_category + ' | Sub Category: ' + checks.special_sub_category + ' | Item ID: ' + checks.special_item_id)
		log.debug('[IDM Check] Skill - Category: ' + checks.skill_category + ' | Sub Category: ' + checks.skill_sub_category + ' | Item ID: ' + checks.skill_item_id)
		log.debug('[IDM Check] Weapon 1 - Category: ' + checks.weapon_1_category + ' | Sub Category: ' + checks.weapon_1_sub_category + ' | Item ID: ' + checks.weapon_1_item_id)
		log.debug('[IDM Check] Weapon 2 - Category: ' + checks.weapon_2_category + ' | Sub Category: ' + checks.weapon_2_sub_category + ' | Item ID: ' + checks.weapon_2_item_id)
		log.debug('[IDM Check] Weapon 3 - Category: ' + checks.weapon_3_category + ' | Sub Category: ' + checks.weapon_3_sub_category + ' | Item ID: ' + checks.weapon_3_item_id)

		db.Account.findByID(session.player_id, function(err, result) {
			if(err) {
				return
			}

			if(!result) {
				return Request.close(session)
			}

			db.Character.findByAccountIDAndSlot(session.player_id, result.active_char_slot, function(err, result) {
				if(err) {
					return
				}

				if(!result) {
					return Request.close(session)
				}

				var head = result.hair
				var face =  result.face
				var shirt = result.shirt
				var pants = result.pants
				var gloves = result.gloves
				var shoes = result.shoes
				var special = result.special
				var weapon_1 = result.weapon_1
				var weapon_2 = result.weapon_2
				var weapon_3 = result.weapon_3
				var skill = result.skill

				db.Inventory.findInID([head, face, shirt, pants, gloves, shoes, special, weapon_1, weapon_2, weapon_3, skill], function(err, result) {
					if(err) {
						return
					}

					if(!result) {
						return Request.close(session)
					}

					var IDM = false
					var item_count = 0

					if(checks.head_category !== 0) {
						item_count++
					}

					if(checks.face_category !== 0) {
						item_count++
					}

					if(checks.shirt_category !== 0) {
						item_count++
					}

					if(checks.pants_category !== 0) {
						item_count++
					}

					if(checks.gloves_category !== 0) {
						item_count++
					}

					if(checks.shoes_category !== 0) {
						item_count++
					}

					if(checks.special_category !== 0) {
						item_count++
					}

					if(checks.weapon_1_category !== 0) {
						item_count++
					}

					if(checks.weapon_2_category !== 0) {
						item_count++
					}

					if(checks.weapon_3_category !== 0) {
						item_count++
					}

					if(checks.skill_category !== 0) {
						item_count++
					}

					// Check if we have the same amount of items in the db like in the relay data...
					if(item_count !== result.length) {
						IDM = true
					}

					for (var i = 0; i < result.length; ++i) {
						var item = result[i]
						// check to which to compare
						var compare = ''
						switch(item.id) {
							case head:
								compare = 'head'
								break
							case face:
								compare = 'face'
								break
							case shirt:
								compare = 'shirt'
								break
							case pants:
								compare = 'pants'
								break
							case gloves:
								compare = 'gloves'
								break
							case shoes:
								compare = 'shoes'
								break
							case special:
								compare = 'special'
								break
							case weapon_1:
								compare = 'weapon_1'
								break
							case weapon_2:
								compare = 'weapon_2'
								break
							case weapon_3:
								compare = 'weapon_3'
								break
							case skill:
								compare = 'skill'
								break
							default:
								compare = ''
						}

						// check if there is something found...
						if(compare === '') {
							IDM = true
							break
						}

						// compare that shiat now
						if(checks[compare + '_category'] !== item.category || checks[compare + '_sub_category'] !== item.sub_category || checks[compare + '_item_id'] !== item.item_id) {
							IDM = true
							break
						}
					}

					if(IDM) {
						log.warning('IDM Hack detected from Player ' + session.player_name + '!')
						Request.close(session)
						// TODO: Also ban the player?
					}
				})
			})
		})
	}
}