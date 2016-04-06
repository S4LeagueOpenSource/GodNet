var Config = require('./Config')
var EAddCombiResult = require('../Core/Constants/EAddCombiResult')
var EAddFriendResult = require('../Core/Constants/EAddFriendResult')
var EChatLoginResult = require('../Core/Constants/EChatLoginResult')
var ECombiNameResult = require('../Core/Constants/ECombiNameResult')
var EDeleteCombiResult = require('../Core/Constants/EDeleteCombiResult')
var EDeleteFriendResult = require('../Core/Constants/EDeleteFriendResult')
var EDenyResult = require('../Core/Constants/EDenyResult')
var EFriendListStatus = require('../Core/Constants/EFriendListStatus')
var EFriendNotify = require('../Core/Constants/EFriendNotify')
var EChatPacket = require('../Core/Constants/Packets/EChatPacket')
var Helper = require('../Core/Utils/Helper')
var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')
var ChannelHandler = require('./ChannelHandler')

var log = new Logger('RequestHandler')

var channels = Cache.channels
var players = []

function broadcast(from, packet) {
	for (var i = 0; i < players.length; ++i) {
		var session = players[i]
		session.write(packet)
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

function getPlayerByName(name) {
	for (var i = 0; i < players.length; ++i) {
		var session = players[i]
		if(session.player_name === name) {
			return session
		}
	}

	return null
}

function getPlayersByChannel(id) {
	var found = []

	for (var i = 0; i < players.length; ++i) {
		var session = players[i]
		if(session.channel_id === id) {
			found.push(session)
		}
	}

	return found
}

function addPlayer(session) {
	players.push(session)
}

function removePlayer(session) {
	players.splice(players.indexOf(session), 1)
}

var Request = module.exports = {
	closed: function(session) {
		if(!session.player_id) {
			return
		}
		process.emit('RequestHandler.Player.Leave', session)
		if(session.channel_id) {
			ChannelHandler.leave(session)
		}
		removePlayer(session)
		db.Server.updateOnline(Config.server_id, -1) // Decrement 1 online player
	},
	handleLoginRequest: function(packet, session) {
		log.debug('CLoginReq')

		if(session.player_id) {
			return
		}

		var id = packet.readUInt64LE()
        var name = packet.readStringNT()

		db.Session.findByAccountID(id, function(err, result) {
			if(err) {
				return session.write(Request.LoginAck(EChatLoginResult.Failure))
			}

			if(!result) {
				return session.write(Request.LoginAck(EChatLoginResult.Failure))
			}

			if(!Helper.validateSession(result, session)) {
				return session.write(Request.LoginAck(EChatLoginResult.Failure))
			}

			db.Account.findByID(id, function(err, result) {
				if(err) {
					return session.write(Request.LoginAck(EChatLoginResult.Failure))
				}

				if(!result) {
					return session.write(Request.LoginAck(EChatLoginResult.Failure))
				}

				if(result.nickname !== name) {
					return session.write(Request.LoginAck(EChatLoginResult.Failure))
				}

				if(Helper.isAccountBanned(result)) {
					return session.write(Request.LoginAck(EChatLoginResult.Failure))
				}

				// Check if Account is already online
				var target = getPlayerByID(result._id)
				if(target) {
					return session.write(Request.LoginAck(EChatLoginResult.Failure))
				}

				session.player_id = result._id
				session.player_name = result.nickname
				session.exp = result.exp
				session.combi_points = result.combi_points
				session.gm_level = result.gm_level

				session.level = Helper.calculateLevel(session.exp).level

				addPlayer(session)

				session.write(Request.LoginAck(EChatLoginResult.OK))

				db.Login.save({ account_id: session.player_id, server_id: Config.server_id })
				db.Server.updateOnline(Config.server_id, 1) // Increment 1 online player
				process.emit('RequestHandler.Player.Join', session)
			})
		})
	},
	handleMessageRequest: function(packet, session) {
		log.debug('CMessageReq')

		if(!session.player_id) {
			return
		}

		var channel = packet.readUInt32LE()
		var textSize = packet.readUInt16LE()
		var text = packet.readString(textSize)

		if(session.channel_id !== channel) {
			return
		}

		ChannelHandler.broadcastToChannel(channel, this.MessageAck(session.player_id, channel, text))

		db.MessageChannel.save({ account_id: session.player_id, channel_id: session.channel_id, text: text })

		process.emit('RequestHandler.Message', session.player_id, session.channel_id, text)
	},
	handleWhisperRequest: function(packet, session) {
		log.debug('CWhisperReq')

		if(!session.player_id) {
			return
		}

		var id = packet.readUInt64LE()
		var unk1 = packet.readUInt32LE()
		var unk2 = packet.readUInt8()
		var textSize = packet.readUInt16LE()
		var text = packet.readString(textSize)

		var target = getPlayerByID(id)

		if(target === null) {
			return
		}

		target.write(this.WhisperAck(session.player_id, unk1, unk2, text))

		db.MessageWhisper.save({ account_id: session.player_id, receiver_account_id: id, text: text })
	},
	handleChannelListRequest: function(packet, session) {
		log.debug('CChannelListReq')

		if(!session.player_id) {
			return
		}

		session.write(this.ChannelListAck())
	},
	handleChannelEnterRequest: function(packet, session) {
		log.debug('CChannelEnterReq')

		if(!session.player_id) {
			return
		}

		var channel_name = packet.readStringNT()

		ChannelHandler.join(session, channel_name)
	},
	handleChannelLeaveRequest: function(packet, session) {
		log.debug('CChannelLeaveReq')

		if(!session.player_id) {
			return
		}

		ChannelHandler.leave(session)
	},
	handleFriendListRequest: function(packet, session) {
		log.debug('CFriendListReq')

		if(!session.player_id) {
			return
		}

		db.Friend.findByAccountIDAndPopulateFriendID(session.player_id, function(err, result) {
			if(err) {
				return
			}

			session.write(Request.FriendListAck(result))
		})
	},
	handleFriendUnkRequest: function(packet, session) {
		log.debug('CFriendUnkReq')

		// TODO

		//if(!session.player_id) {
		//	return
		//}

		//var count = packet.readUInt8()

		//var data = packet.readRemaining()

		//console.log(data.toString('hex'))
	},
	handleCombiListRequest: function(packet, session) {
		log.debug('CCombiListReq')

		if(!session.player_id) {
			return
		}

		session.write(this.CombiListAck(session))
	},
	handleDenyListReq: function(packet, session) {
		log.debug('CDenyListReq')

		if(!session.player_id) {
			return
		}

		db.Deny.findByAccountIDAndPopulateDenyID(session.player_id, function(err, result) {
			if(err) {
				return
			}

			session.write(Request.DenyListAck(result))
		})
	},
	handleGetDataRequest: function(packet, session) {
		log.debug('CGetDataReq')

		if(!session.player_id) {
			return
		}

		var id = packet.readUInt64LE()

		var player = getPlayerByID(id)

		if(player === null) {
			return
		}

		session.write(this.GetDataAck(player))
	},
	handleSetDataRequest: function(packet, session) {
		log.debug('CSetDataReq')

		if(!session.player_id) {
			return
		}

		// TODO: Debug that shit more...
		var unk = packet.readUInt16LE()
        var id = packet.readUInt64LE()
		session.server_id = packet.readUInt16LE()
		var channel_id = packet.readInt16LE()
		var room_id = packet.readInt32LE()
		session.communityByte = packet.readUInt8()
		session.exp = packet.readUInt32LE()
		session.stats = packet.readBuffer(32)
		session.allowCombiRequest = packet.readUInt8()
		session.allowFriendRequest = packet.readUInt8()
		session.allowInvite = packet.readUInt8()
		session.allowInfoRequest = packet.readUInt8()
		session.communityData = packet.readBuffer(41)

		var oldRoom = session.room_id

		// TODO: Check if room exists
		if(room_id === -1) {
			session.room_id = null
		} else {
			session.room_id = room_id
		}

		if(!session.channel_id) {
			return
		}

		if(oldRoom === session.room_id) {
			return
		}

		ChannelHandler.broadcastToChannel(session.channel_id, ChannelHandler.ChannelPlayerListInfoAck(session.channel_id))
	},
	handleSetStateRequest: function(packet, session) {
		log.debug('CSetStateReq')

		if(!session.player_id) {
			return
		}

		// TODO
		//console.log(packet.data.toString('hex'))
		//console.log(packet.data.toString())
	},
	handleAddDenyRequest: function(packet, session) {
		log.debug('CAddDenyReq')

		if(!session.player_id) {
			return
		}

		var id = packet.readUInt64LE()
		var nickname = packet.readStringNT()

		if(session.player_id === id) {
			return session.write(Request.AddDenyAck(EDenyResult.Failed2))
		}

		var target = getPlayerByID(id)
		if(!target) {
			return session.write(Request.AddDenyAck(EDenyResult.Failed2))
		}

		// Check if the name is correct
		if(target.player_name !== nickname) {
			return session.write(Request.AddDenyAck(EDenyResult.Failed2))
		}

		// Don't allow to block GMs
		if(target.gm_level > 0) {
			return session.write(Request.AddDenyAck(EDenyResult.Failed2))
		}

		db.Deny.save({ account_id: session.player_id, deny_id: id }, function(err, result) {
			if(err) {
				return session.write(Request.AddDenyAck(EDenyResult.Failed2))
			}

			session.write(Request.AddDenyAck(EDenyResult.OK, id, nickname))
		})
	},
	handleRemoveDenyRequest: function(packet, session) {
		log.debug('CRemoveDenyReq')

		if(!session.player_id) {
			return
		}

		var id = packet.readUInt64LE()
		var nickname = packet.readStringNT()

		if(session.player_id === id) {
			return session.write(Request.RemoveDenyAck(EDenyResult.Failed2))
		}

		db.Deny.deleteByAccountIDAndDenyID(session.player_id, id, function(err, result) {
			if(err) {
				return session.write(Request.RemoveDenyAck(EDenyResult.Failed2))
			}

			session.write(Request.RemoveDenyAck(EDenyResult.OK, id, nickname))
		})
	},
	handleAddFriendRequest: function(packet, session) {
		log.debug('CAddFriendReq')

		if(!session.player_id) {
			return
		}

		var id = packet.readUInt64LE()
		var nickname = packet.readStringNT()

		// TODO: Check own friendlist limit
		//session.write(Request.AddFriendAck(id, EAddFriendResult.LimitExceeded, nickname))

		if(session.player_id === id) {
			return session.write(Request.AddFriendAck(id, EAddFriendResult.Failed, nickname))
		}

		var target = getPlayerByID(id)
		if(!target) {
			return session.write(Request.AddFriendAck(id, EAddFriendResult.DoenstExist, ''))
		}

		// Check if the name is correct
		if(target.player_name !== nickname) {
			return session.write(Request.AddFriendAck(id, EAddFriendResult.DoenstExist, ''))
		}

		// Check if already friends
		db.Friend.findByAccountIDAndFriendID(session.player_id, id, function(err, result) {
			if(err) {
				return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.Failed, nickname))
			}

			if(result) {
				if(result.status === EFriendListStatus.FriendRequest) {
					return session.write(Request.AddFriendAck(id, EAddFriendResult.AlreadyRequested, nickname))
				} else if(result.status === EFriendListStatus.OnlyRegisteredInMyList || result.status === EFriendListStatus.MutualFriend) {
					return session.write(Request.AddFriendAck(id, EAddFriendResult.AlreadyInList, nickname))
				} else {
					return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.Failed, nickname))
				}
			}

			// Check if the target has this player still in his list...
			db.Friend.findByAccountIDAndFriendID(id, session.player_id, function(err, result) {
				if(err) {
					return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.Failed, nickname))
				}

				if(result) { // Recover the long lasting friendship!
					db.Friend.UpdateStatusByAccountIDAndFriendID(id, session.player_id, EFriendListStatus.MutualFriend, function(err) { // Update target first
						if(err) {
							return
						}

						// Recover the friendship for us again ;)
						db.Friend.save({ account_id: session.player_id, friend_id: target.player_id, status: EFriendListStatus.MutualFriend }, function(err, result) {
							if(err) {
								return session.write(Request.AddFriendAck(id, EAddFriendResult.Failed, nickname))
							}

							session.write(Request.AddFriendAck(id, EAddFriendResult.RequestAccepted, nickname))

							// TODO: Doesn't work
							//target.write(Request.BRSFriendNotifyAck(session, target, EFriendNotify.RecoverRelation))

							// Use that shit instead
							target.write(Request.BRSFriendNotifyAck(session, target, EFriendNotify.Accepted))

							return
						})
					})
					return
				}

				// TODO: Check target friendlist limit
				//return session.write(Request.AddFriendAck(id, EAddFriendResult.TargetLimitExceeded, nickname))

				// New Friendship!
				db.Friend.save({ account_id: session.player_id, friend_id: target.player_id, status: EFriendListStatus.FriendRequest }, function(err, result) {
					if(err) {
						return session.write(Request.AddFriendAck(id, EAddFriendResult.Failed, nickname))
					}

					// Target Save
					db.Friend.save({ account_id: target.player_id, friend_id: session.player_id, status: EFriendListStatus.AcceptingFriendRequest }, function(err, result) {
						if(err) {
							return session.write(Request.AddFriendAck(id, EAddFriendResult.Failed, nickname))
						}

						target.write(Request.BRSFriendNotifyAck(session, target, EFriendNotify.Request))
						session.write(Request.AddFriendAck(id, EAddFriendResult.MadeRequest, nickname))
					})
				})
			})
		})
	},
	handleDeleteFriendRequest: function(packet, session) {
		log.debug('CDeleteFriendReq')

		if(!session.player_id) {
			return
		}

		var id = packet.readUInt64LE()
		var nickname = packet.readStringNT()

		db.Account.findByNickname(nickname, function(err, result) {
			if(err) {
				return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.Failed, nickname))
			}

			if(!result) {
				return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.DoenstExist, ''))
			}

			if(result.nickname !== nickname) {
				return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.DoenstExist, ''))
			}

			db.Friend.findByAccountIDAndFriendID(session.player_id, id, function(err, friend) {
				if(err) {
					return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.Failed, nickname))
				}

				if(!friend) {
					return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.DoenstExist, ''))
				}

				if(friend.status === EFriendListStatus.FriendRequest) { // remove both entries
					db.Friend.deleteByAccountIDAndFriendID(id, session.player_id, function(err) { // delete the request
						if(err) {
							return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.Failed, nickname))
						}

						friend.remove(function(err) { // delete your own entry
							if(err) {
								return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.Failed, nickname))
							}

							session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.OK, nickname))

							var target = getPlayerByID(id)
							if(target) { // check if the target is online to broadcast the deletion ;o
								target.write(Request.BRSFriendNotifyAck(session, target, EFriendNotify.DeleteRelation))
							}
						})
					})
				} else if(friend.status === EFriendListStatus.MutualFriend) { // remove own entry and update other status
					db.Friend.UpdateStatusByAccountIDAndFriendID(id, session.player_id, EFriendListStatus.OnlyRegisteredInMyList, function(err) { // Update other first
						if(err) {
							return
						}

						db.Friend.deleteByAccountIDAndFriendID(session.player_id, id, function(err) { // delete the own entry
							if(err) {
								return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.Failed, nickname))
							}

							session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.OK, nickname))

							var target = getPlayerByID(id)
							if(target) { // check if the target is online to broadcast the deletion ;o
								target.write(Request.BRSFriendNotifyAck(session, target, EFriendNotify.DeleteRelation))
							}
						})
					})
				} else if(friend.status === EFriendListStatus.OnlyRegisteredInMyList) { // remove own entry
					db.Friend.deleteByAccountIDAndFriendID(session.player_id, id, function(err) { // delete the own entry
						if(err) {
							return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.Failed, nickname))
						}

						session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.OK, nickname))
					})
				} else {
					return session.write(Request.DeleteFriendAck(id, EDeleteFriendResult.Failed, nickname))
				}
			})
		})
	},
	handleBRSFriendNotifyRequest: function(packet, session) {
		log.debug('CBRSFriendNotifyReq')

		if(!session.player_id) {
			return
		}

		var id = packet.readUInt64LE()
		var accepted = packet.readInt32LE() > 0
		var nickname = packet.readStringNT()

		if(session.player_id === id) {
			return
		}

		var target = getPlayerByID(id)
		if(!target) {
			return
		}

		// Check if the name is correct
		if(target.player_name !== nickname) {
			return
		}

		if(accepted) {
			// Update both status(e)
			db.Friend.UpdateStatusByAccountIDAndFriendID(target.player_id, session.player_id, EFriendListStatus.MutualFriend, function(err) { // Update requester first
				if(err) {
					return
				}

				db.Friend.UpdateStatusByAccountIDAndFriendID(session.player_id, target.player_id, EFriendListStatus.MutualFriend, function(err) { // Update own
					if(err) {
						return
					}

					target.write(Request.BRSFriendNotifyAck(session, target, EFriendNotify.Accepted))
					session.write(Request.BRSFriendNotifyAck(target, session, EFriendNotify.Accepted))
				})
			})
		} else {
			// Remove own and update requester
			db.Friend.deleteByAccountIDAndFriendID(target.player_id, session.player_id, function(err) { // delete requester first
				if(err) {
					return
				}

				db.Friend.deleteByAccountIDAndFriendID(session.player_id, target.player_id, function(err) { // delete own
					if(err) {
						return
					}

					target.write(Request.BRSFriendNotifyAck(session, target, EFriendNotify.Denied))
					target.write(Request.BRSFriendNotifyAck(session, target, EFriendNotify.DeleteRelation))
					session.write(Request.BRSFriendNotifyAck(target, session, EFriendNotify.Denied))
					session.write(Request.BRSFriendNotifyAck(target, session, EFriendNotify.DeleteRelation))
				})
			})
		}
	},
	handleInviteRequest: function(packet, session) {
		log.debug('CInviteReq')

		if(!session.player_id) {
			return
		}

		// To
		var target_id = packet.readUInt64LE()
		// From
		var unk = packet.readUInt32LE() // unk
		var name = packet.readStringNT()
		var unk2 = packet.readUInt8() // unk
		var unk3 = packet.readStringNT() // unk
		var id = packet.readUInt64LE()
		var server = packet.readUInt16LE()
		var channel = packet.readUInt16LE()
		var room = packet.readUInt32LE()
		var unk4 = packet.readRemaining()

		// TODO

		return

		// Testing

		//console.log(unk4)

		var target = getPlayerByID(target_id)

		if(target === null) {
			return
		}

		// TODO: Doesn't work
		log.debug('InviteAck')
		var packet = new Packet(EChatPacket.SInviteAck)
		packet.writeUInt64LE(target_id)
		packet.writeStringNT(name)
		packet.writeUInt64LE(id)
		packet.writeUInt16LE(server)
		packet.writeUInt16LE(channel)
		packet.writeUInt32LE(room)

		var result = packet.finalize()
		console.log(result)
		target.write(result)
	},
	handleAddCombiRequest: function(packet, session) {
		log.debug('CAddCombiReq')

		if(!session.player_id) {
			return
		}

		var id = packet.readUInt64LE()
		var nickname = packet.readStringNT(31)
		var name = packet.readStringNT(31)

		// TODO

		// TODO: Failed
		//session.write(Request.AddCombiAck(id, EAddCombiResult.Failed, nickname))

		// TODO: AlreadyInList
		//session.write(Request.AddCombiAck(id, EAddCombiResult.AlreadyInList, nickname))

		// TODO: Request Impossible for 2 days
		//session.write(Request.AddCombiAck(id, EAddCombiResult.RequestImpossible, nickname))

		// TODO: User doesn't exist
		//session.write(Request.AddCombiAck(id, EAddCombiResult.UserDoenstExist, nickname))

		// TODO: Already Requested
		//session.write(Request.AddCombiAck(id, EAddCombiResult.AlreadyRequested, nickname))

		// TODO: Name Already In Use
		//session.write(Request.AddCombiAck(id, EAddCombiResult.NameAlreadyInUse, nickname))

		// TODO: Limit exceeded
		//session.write(Request.AddCombiAck(id, EAddCombiResult.LimitExceeded, nickname))

		session.write(Request.AddCombiAck(id, EAddCombiResult.OK, nickname))
	},
	handleDeleteCombiRequest: function(packet, session) {
		log.debug('CDeleteCombiReq')

		if(!session.player_id) {
			return
		}

		var id = packet.readUInt64LE()
		var nickname = packet.readStringNT(31)

		// TODO

		// TODO: Failed
		//session.write(Request.DeleteCombiAck(id, EDeleteCombiResult.Failed, nickname))

		session.write(Request.DeleteCombiAck(id, EDeleteCombiResult.OK, nickname))
	},
	handleCombiNameRequest: function(packet, session) {
		log.debug('CCombiNameReq')

		if(!session.player_id) {
			return
		}

		var name = packet.readStringNT(31)

		// TODO

		// TODO: Already exists
		//session.write(Request.CombiNameAck(ECombiNameResult.AlreadyExists))

		session.write(Request.CombiNameAck(ECombiNameResult.OK))
	},
	handleBRSCombiNotifyRequest: function(packet, session) {
		log.debug('CBRSCombiNotifyReq')

		if(!session.player_id) {
			return
		}

		var id = packet.readUInt64LE()
		var accepted = packet.readInt32LE() > 0
		var nickname = packet.readStringNT(31)
		var name = packet.readStringNT(31)

		// TODO

		//session.write(Request.BRSCombiNotifyAck())
	},
	LoginAck: function(result) {
		log.debug('LoginAck')

		var packet = new Packet(EChatPacket.SLoginAck)
		packet.writeUInt32LE(result)
		return packet.finalize()
	},
	ChannelListAck: function() {
		log.debug('ChannelListAck')

		var packet = new Packet(EChatPacket.SChannelListAck)

		packet.writeUInt32LE(channels.length)

		for (var i = 0; i < channels.length; ++i) {
			var channel = channels[i]
			packet.writeUInt8(channel.id) // unk
			packet.writeUInt32LE(channel.id)
			packet.writeString(channel.name, 21)
		}
		return packet.finalize()
	},
	FriendListAck: function(friends) {
		log.debug('FriendListAck')

		// Friendlist limit: 255 -.-
		var packet = new Packet(EChatPacket.SFriendListAck)
		packet.writeUInt8(friends.length)
		for (var i = 0; i < friends.length; ++i) {
			var friend = friends[i]
			packet.writeUInt64LE(friend.friend_id._id)
			packet.writeUInt32LE(0) // unk
			packet.writeUInt8(friend.status)
			packet.writeUInt8(0) // unk
			packet.writeString(friend.friend_id.nickname, 31)
		}
		return packet.finalize()
	},
	CombiListAck: function(session) {
		log.debug('CombiListAck')

		var combis = [
			/*
			{
				id: 1,
				status: 2,
				match: 10,
				win: 9,
				lose: 1,
				user: 'Test',
				name: 'Eins'
			},
			{
				id: 2,
				status: 2,
				match: 10,
				win: 9,
				lose: 1,
				user: 'Test2',
				name: 'Zwei'
			},
			{
				id: 3,
				status: 2,
				match: 10,
				win: 9,
				lose: 1,
				user: 'Test3',
				name: 'Drei'
			}
			*/
		]

		var packet = new Packet(EChatPacket.SCombiListAck)
		packet.writeUInt32LE(session.combi_points) // Combi points
		packet.writeUInt32LE(0) // unk
		packet.writeUInt8(combis.length)
		for (var i = 0; i < combis.length; ++i) {
			var combi = combis[i]
			packet.writeUInt64LE(combi.id)
			packet.writeUInt8(0) // unk
			packet.writeUInt8(combi.status) // 1 = Requesting Combi, 2 = Mutual Combi, 3 = Combi Request
			packet.writeUInt32LE(63703100) // exp
			packet.writeUInt32LE(0) // unk
			packet.writeUInt32LE(0) // unk
			packet.writeUInt32LE(0) // unk
			packet.writeUInt64LE(combi.match)
			packet.writeUInt64LE(combi.win)
			packet.writeUInt64LE(combi.lose)
			packet.writeUInt16LE(0) // unk
			packet.writeString(combi.user, 31)
			packet.writeString(combi.name, 31)
			packet.writeUInt16LE(0) // unk
			packet.writeString('2014') // year
			packet.writeString('12') // month
			packet.writeString('30') // day
			packet.writeUInt8(0) // unk
			packet.writeUInt8(0) // unk
			packet.writeUInt8(0) // unk
			packet.writeUInt32LE(0) // unk
		}
		return packet.finalize()
	},
	DenyListAck: function(denies) {
		log.debug('DenyListAck')

		var packet = new Packet(EChatPacket.SDenyListAck)
		packet.writeUInt32LE(denies.length)
		for (var i = 0; i < denies.length; ++i) {
			var deny = denies[i]
			packet.writeUInt64LE(deny.deny_id._id)
			packet.writeString(deny.deny_id.nickname, 31)
		}
		return packet.finalize()
	},
	AddDenyAck: function(result, id, nickname) {
		log.debug('AddDenyAck')

		var packet = new Packet(EChatPacket.SAddDenyAck)
		packet.writeUInt8(result)
		if(result == EDenyResult.OK) {
			packet.writeUInt64LE(id)
			packet.writeString(nickname, 31)
		}
		return packet.finalize()
	},
	RemoveDenyAck: function(result, id, nickname) {
		log.debug('RemoveDenyAck')

		var packet = new Packet(EChatPacket.SRemoveDenyAck)
		packet.writeUInt8(result)
		if(result == EDenyResult.OK) {
			packet.writeUInt64LE(id)
			packet.writeString(nickname, 31)
		}
		return packet.finalize()
	},
	AddFriendAck: function(id, result, nickname) {
		log.debug('AddFriendAck')

		var packet = new Packet(EChatPacket.SAddFriendAck)
		packet.writeUInt64LE(id)
		packet.writeUInt8(result)
		packet.writeString(nickname, 31)
		return packet.finalize()
	},
	DeleteFriendAck: function(id, result, nickname) {
		log.debug('DeleteFriendAck')

		var packet = new Packet(EChatPacket.SDeleteFriendAck)
		packet.writeUInt64LE(id)
		packet.writeUInt8(result)
		packet.writeString(nickname, 31)
		return packet.finalize()
	},
	MessageAck: function(player_id, channel, text) {
		log.debug('MessageAck')

		var packet = new Packet(EChatPacket.SMessageAck)
		packet.writeUInt64LE(player_id)
		packet.writeUInt32LE(channel)
		packet.writeUInt16LE(text.length)
		packet.writeString(text, text.length)
		return packet.finalize()
	},
	WhisperAck: function(player_id, unk1, unk2, text) {
		log.debug('WhisperAck')

		var packet = new Packet(EChatPacket.SWhisperAck)
        packet.writeUInt64LE(player_id)
        packet.writeUInt32LE(unk1)
        packet.writeUInt8(unk2)
        packet.writeUInt16LE(text.length)
        packet.writeString(text, text.length)
		return packet.finalize()
	},
	GetDataAck: function(player) {
		log.debug('GetDataAck')

		var packet = new Packet(EChatPacket.SGetDataAck)
		packet.writeUInt64LE(player.player_id)
		packet.writeUInt8(0) // result | 0 -> 0k, 1 -> failed
		ChannelHandler.writeUserData(packet, player, true)
		return packet.finalize()
	},
	BRSFriendNotifyAck: function(from, to, mode) {
		log.debug('BRSFriendNotifyAck')

		var packet = new Packet(EChatPacket.SBRSFriendNotifyAck)
		packet.writeUInt64LE(from.player_id)
		packet.writeUInt64LE(to.player_id)
		packet.writeUInt8(mode)
		packet.writeString(from.player_name, 31)
		return packet.finalize()
    },
	AddCombiAck: function(id, result, nickname) {
		log.debug('AddCombiAck')

		var packet = new Packet(EChatPacket.SAddCombiAck)
		packet.writeUInt64LE(id)
		packet.writeUInt8(result)
		packet.writeString(nickname, 31)
		return packet.finalize()
	},
	DeleteCombiAck: function(id, result, nickname) {
		log.debug('DeleteCombiAck')

		var packet = new Packet(EChatPacket.SDeleteCombiAck)
		packet.writeUInt64LE(id)
		packet.writeUInt8(result)
		packet.writeString(nickname, 31)
		return packet.finalize()
	},
	CombiNameAck: function(result) {
		log.debug('CombiNameAck')

		var packet = new Packet(EChatPacket.SCombiNameAck)
		packet.writeUInt8(result)
		return packet.finalize()
	},
	BRSCombiNotifyAck: function() {
		log.debug('BRSCombiNotifyAck')

		var packet = new Packet(EChatPacket.SBRSCombiNotifyAck)
		packet.writeUInt64LE(1) // Combi ID??
		packet.writeUInt8(1) // Mode | 1 -> OK, 2 -> Failed, 3 -> Not found, 4 -> Already in Combi, 6 -> Impossible (wait 2 days)
		packet.writeStringNT('Netrunner', 31) // From Player Name Combi
		return packet.finalize()
	}
}

// PLUGIN STUFF
process.on('WebSocket.Sync', function(callback) {
	var result = {
		online: true,
		name: Cache.name,
		players: {
			online: players.length,
			limit: Cache.playerLimit
		}
	}
	callback(result)
})

process.on('WebSocket.Message', function(player_id, channel_id, text) {
	ChannelHandler.broadcastToChannel(channel_id, Request.MessageAck(player_id, channel_id, text))
	process.emit('RequestHandler.Message', player_id, channel_id, text)
})