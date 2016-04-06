var _ = require('../Core/node_modules/underscore')
var async = require('../Core/node_modules/async')
var Config = require('./Config')
var EAdminCommand = require('../Core/Constants/EAdminCommand')
var EBuyItemResult = require('../Core/Constants/EBuyItemResult')
var EChannelInfoType = require('../Core/Constants/EChannelInfoType')
var EGameLoginResult = require('../Core/Constants/EGameLoginResult')
var EGameRule = require('../Core/Constants/EGameRule')
var EGameRuleState = require('../Core/Constants/EGameRuleState')
var EGameTimeState = require('../Core/Constants/EGameTimeState')
var EItemCategories = require('../Core/Constants/EItemCategories')
var EItem = require('../Core/Constants/EItem')
var EItemUseType = require('../Core/Constants/EItemUseType')
var ELicenseItem = require('../Core/Constants/ELicenseItem')
var EPlayerEventMessage = require('../Core/Constants/EPlayerEventMessage')
var EPlayerGameMode = require('../Core/Constants/EPlayerGameMode')
var EPlayerState = require('../Core/Constants/EPlayerState')
var ERefundItemResult = require('../Core/Constants/ERefundItemResult')
var EServerResult = require('../Core/Constants/EServerResult')
var ETeam = require('../Core/Constants/ETeam')
var EGamePacket = require('../Core/Constants/Packets/EGamePacket')
var Helper = require('../Core/Utils/Helper')
var Logger = require('../Core/Utils/Logger')
var Packet = require('../Core/Network/Packet')
var ChannelHandler = require('./ChannelHandler')
var RoomHandler = require('./RoomHandler')

var log = new Logger('RequestHandler')

var ProcessStartTime = new Date().getTime()

var players = []

function broadcast(packet) {
	for (var i = 0; i < players.length; ++i) {
		var session = players[i]
		session.write(packet)
	}
}

function getCharacterBySlot(characters, slot) {
	for (var i = 0; i < characters.length; ++i) {
		var character = characters[i]
		if(character.slot === slot) {
			return character
		}
	}

	return null
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

function getPlayerByName(name, insensitive) {
	if(insensitive) {
		name = name.toLowerCase()
		for (var i = 0; i < players.length; ++i) {
			var session = players[i]
			if(session.player_name_clean === name) {
				return session
			}
		}

		return null
	}

	for (var i = 0; i < players.length; ++i) {
		var session = players[i]
		if(session.player_name === name) {
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

process.on('broadcast', function(packet) {
	broadcast(packet)
})

var Request = module.exports = {
	close: function(session) {
		log.debug('Connection closed')
		this.closed(session)
		session.destroy()
	},
	closed: function(session) {
		if(!session.player_id) {
			return
		}
		process.emit('RequestHandler.Player.Leave', session)
		if(session.room_id) {
			RoomHandler.leave(session, 6)
		}
		if(session.channel_id) {
			ChannelHandler.leave(session, 2)
		}
		removePlayer(session)
		db.Server.updateOnline(Config.server_id, -1) // Decrement 1 online player
	},
	validatePacketCounter: function(packet_counter, session) {
		if(packet_counter === session.packet_counter) {
			session.packet_counter++
			return true
		}

		log.debug('Invalid Packet Counter. Expected: ' + session.packet_counter + ' Got: ' + packet_counter)
		return false
	},
	handleLoginRequest: function(packet, session) {
		log.debug('CLoginReq')

		if(session.player_id) {
			return
		}

		if(session.isAuthenticating) {
			return
		}

		session.isAuthenticating = true

		var name = packet.readStringNT(23)
		packet.skip(20) // skip S4 trash ;o
        var session_id = packet.readUInt32LE()
		packet.skip(4) //var unk1 = packet.readUInt32LE()
		packet.readStringNT(33) //var unk2 = packet.readStringNT(33)
		packet.skip(12) // unk
		var force_join = packet.readUInt8()

		if(this.isServerOverloaded()) {
			session.isAuthenticating = false
			session.write(Request.LoginAck(0, EGameLoginResult.Error4))
			session.write(Request.ResultAck(EServerResult.LogForbidden))
			return
		}

		if(this.isPlayerLimitExceeded()) {
			session.isAuthenticating = false
			return session.write(Request.LoginAck(0, EGameLoginResult.PlayerLimitExceeded))
		}

		if(this.isIPBlacklisted(session.remoteAddress)) {
			session.isAuthenticating = false
			session.write(Request.LoginAck(0, EGameLoginResult.Error4))
			session.write(Request.ResultAck(EServerResult.LogSpecifiedIP))
			return
		}

		async.series({
			login: function(callback) {
				db.Session.findByID(session_id, function(err, result) {
					if(err) {
						session.write(Request.LoginAck(0, EGameLoginResult.Error4))
						return callback(err, null)
					}

					// check if we found a session
					if(!result) {
						session.write(Request.LoginAck(0, EGameLoginResult.Error5))
						return callback(true, null)
					}

					if(!Helper.validateSession(result, session)) {
						session.write(Request.LoginAck(0, EGameLoginResult.Error5))
						return callback(true, null)
					}

					db.Account.findByID(result.account_id, function(err, result) {
						if(err) {
							session.write(Request.LoginAck(0, EGameLoginResult.Error4))
							return callback(err, null)
						}

						// check if we found an account
						if(!result) {
							session.write(Request.LoginAck(0, EGameLoginResult.Error5))
							return callback(true, null)
						}

						// check account name...
						if(result.login !== name) {
							session.write(Request.LoginAck(0, EGameLoginResult.Error5))
							return callback(true, null)
						}

						if(Helper.isAccountBanned(result)) {
							session.write(Request.LoginAck(0, EGameLoginResult.Error5))
							return callback(true, null)
						}

						// Check if Account is already online
						var target = getPlayerByID(result._id)
						if(target) {
							if(force_join) {
								target.write(Request.ResultAck(EServerResult.LoginFromElsewhere))
								session.write(Request.LoginAck(0, EGameLoginResult.TryAgain))
								return callback(true, null)
							} else {
								session.write(Request.LoginAck(0, EGameLoginResult.AlreadyOnline))
								return callback(true, null)
							}
						}

						// add id and name to session
						session.player_id = result._id
						session.exp = result.exp
						session.pen = result.pen
						session.ap = result.ap
						session.combi_points = result.combi_points
						session.stats = result.stats
						session.gm_level = result.gm_level
						session.active_char_slot = result.active_char_slot
						session.tutorial_completed = result.tutorial_completed

						session.level = Helper.calculateLevel(session.exp).level
						session.combi_level = Helper.calculateCombiLevel(session.combi_points).level
						session.team = 0
						session.state = 0
						session.isReady = 0
						session.gameMode = 0
						session.isConnecting = false

						// add the session to the open sessions ;o
						addPlayer(session)

						db.Login.save({ account_id: session.player_id, server_id: Config.server_id })

						db.Server.updateOnline(Config.server_id, 1) // Increment 1 online player
						process.emit('RequestHandler.Player.Join', session)

						// Check if it's a new account
						if(!result.nickname_set) {
							session.write(Request.LoginAck(session.player_id, EGameLoginResult.NewAccount))
							return callback(true, null)
						}

						// assign the player name...
						session.player_name = result.nickname
						session.player_name_clean = result.nickname_clean

						session.write(Request.LoginAck(session.player_id, EGameLoginResult.OK), function(err, result) {
							callback(err, result)
						})
					})
				})
			},
			sendAccountInfo: function(callback) {
				Request.sendAccountInfo(session)
				callback(null, null)
			}
		}, function() {
			session.isAuthenticating = false
		})
	},
	handleCheckNicknameRequest: function(packet, session) {
		log.debug('CCheckNicknameReq')

		if(session.player_name) {
			return
		}

		var name = packet.readStringNT()

		// Check if the Nickname is available...
		db.Account.findByNickname(name, function(err, result) {
			if(err) {
				return session.write(Request.ResultAck(EServerResult.NicknameAlreadyUsed)) // TODO: better error handling...
			}

			// check if account exists
			if(result) {
				session.write(Request.ResultAck(EServerResult.NicknameAlreadyUsed))
			} else {
				session.write(Request.ResultAck(EServerResult.NicknameAvailable))
			}
		})
	},
	handleCreateAccountRequest: function(packet, session) {
		log.debug('CCreateAccountReq')

		if(session.player_name) {
			return
		}

		var name = packet.readStringNT()

		// Check if the Nickname is available...
		db.Account.findByNickname(name, function(err, result) {
			if(err) {
				return session.write(Request.ResultAck(EServerResult.NicknameAlreadyUsed)) // TODO: better error handling...
			}

			// check if account exists
			if(result) {
				return session.write(Request.ResultAck(EServerResult.NicknameAlreadyUsed))
			}

			// Get the account
			db.Account.findByID(session.player_id, function(err, account) {
				if(err) {
					return session.write(Request.ResultAck(EServerResult.NicknameAlreadyUsed)) // TODO: better error handling...
				}

				// set the new name
				account.nickname_clean = name
				account.nickname = name
				account.nickname_set = 1

				// Save the nickname to the account
				account.save(function(err) {
					if(err) {
						return session.write(Request.ResultAck(EServerResult.NicknameAlreadyUsed)) // TODO: better error handling...
					}

					session.write(Request.ResultAck(EServerResult.NickCreateSuccess))

					// assign the player name...
					session.player_name = name
					session.player_name_clean = name.toLowerCase()

					// Go on with sending the account information...
					Request.sendAccountInfo(session)
				})
			})
		})
	},
	handleCreateCharacterRequest: function(packet, session) {
		log.debug('CCreateCharacterReq')

		if(!session.player_id) {
			return
		}

		if(session.room_id) {
			return
		}

		var slot = packet.readUInt8()
		var avatar = packet.readUInt32LE()

		async.series({
			validate: function(callback) {
				db.Character.findByAccountID(session.player_id, function(err, character) {
					if(err) {
						session.write(Request.ResultAck(EServerResult.FailedCreatePlayer))
						return callback(err, null)
					}

					// no more than 3 chars
					if(character.length >= 3) {
						session.write(Request.ResultAck(EServerResult.FailedCreatePlayer))
						return callback(true, null)
					}

					// check if the slot is already there...
					for (var i = 0; i < character.length; ++i) {
						var char = character[i]
						if(char.slot === slot) {
							session.write(Request.ResultAck(EServerResult.FailedCreatePlayer))
							return callback(true, null)
						}
					}

					callback(null, null)
				})
			},
			save: function(callback) {
				db.Character.save({ account_id: session.player_id, slot: slot, avatar: avatar }, function(err, result) {
					if(err) {
						session.write(Request.ResultAck(EServerResult.FailedCreatePlayer))
						return callback(err, null)
					}

					callback(null, null)
				})
			},
			response: function(callback) {
				session.write(Request.CreateCharacterAck(slot, avatar))
				callback(null, null)
			}
		}, function(err, result) {

		})
	},
	handleSelectCharacterRequest: function(packet, session) {
		log.debug('CSelectCharacterReq')

		if(!session.player_id) {
			return
		}

		var slot = packet.readUInt8()

		// Only the range between 0 and 2 is allowed
		if(slot < 0 && slot > 2) {
			return session.write(Request.ResultAck(EServerResult.FailedSelectPlayer))
		}

		db.Character.findByAccountIDAndSlot(session.player_id, slot, function(err, account) {
			if(err) {
				return session.write(Request.ResultAck(EServerResult.FailedSelectPlayer))
			}

			// check if character exists
			if(!account) {
				return session.write(Request.ResultAck(EServerResult.FailedSelectPlayer))
			}

			db.Account.findByID(session.player_id, function(err, account) {
				// check if already this slot
				if(account.active_char_slot === slot) {
					return session.write(Request.SelectCharacterAck(slot))
				}
				// set new slot
				account.active_char_slot = slot
				// save
				account.save(function(err) {
					if(err) {
						return session.write(Request.ResultAck(EServerResult.FailedSelectPlayer))
					}

					session.active_char_slot = slot

					session.write(Request.SelectCharacterAck(slot))
				})
			})
		})
	},
	handleDeleteCharacterRequest: function(packet, session) {
		log.debug('CDeleteCharacterReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(session.room_id) {
			return
		}

		var slot = packet.readUInt8()

		// Only the range between 0 and 2 is allowed
		if(slot < 0 && slot > 2) {
			return session.write(Request.ResultAck(EServerResult.FailedDeletePlayer))
		}

		// can't delete current active slot
		if(session.active_char_slot === slot) {
			return session.write(Request.ResultAck(EServerResult.FailedDeletePlayer))
		}

		db.Character.findByAccountIDAndSlot(session.player_id, slot, function(err, character) {
			if(err) {
				return session.write(Request.ResultAck(EServerResult.FailedDeletePlayer))
			}

			// check if character exists
			if(!character) {
				return session.write(Request.ResultAck(EServerResult.FailedDeletePlayer))
			}

			db.Character.deleteByAccountIDAndSlot(session.player_id, slot, function(err) {
				if(err) {
					return session.write(Request.ResultAck(EServerResult.FailedDeletePlayer))
				}

				session.write(Request.DeleteCharacterAck(slot))
			})
		})
	},
	handleTimeSyncRequest: function(packet, session) {
		//log.debug('CTimeSyncReq')

		if(!session.player_id) {
			return
		}

		var time = packet.readUInt32LE()
		var ts = new Date().getTime() - ProcessStartTime

		session.write(this.TimeSyncAck(time, ts))

		session.player_ping = time - session.player_last_sync_time - 3000
		session.player_last_sync_time = time
	},
	handleChannelInfoRequest: function(packet, session) {
		log.debug('CChannelInfoReq')

		if(!session.player_id) {
			return
		}

		var type = packet.readUInt8()

		switch (type) {
		    case EChannelInfoType.Channel:
				if(session.channel_id) {
					return
				}

				if(session.room_id) {
					return
				}

				session.write(ChannelHandler.ChannelInfoAck())
		        break
			case EChannelInfoType.Room:
			case EChannelInfoType.Room_First: // Why?
				if(!session.channel_id) {
					return
				}

				if(session.room_id) {
					return
				}

				session.write(RoomHandler.RoomListAck(session.channel_id))
		        break
			//default: // hacker
				// Feel free to do something with the hacker ;)
				//break
		}
	},
	handleChannelEnterRequest: function(packet, session) {
		log.debug('CChannelEnterReq')

		if(!session.player_id) {
			return
		}

		var id = packet.readUInt32LE()

		ChannelHandler.join(session, id)
	},
	handleChannelLeaveRequest: function(packet, session) {
		log.debug('CChannelLeaveReq')

		if(!session.player_id) {
			return
		}

		ChannelHandler.leave(session)
	},
	handleGetPlayerInfoRequest: function(packet, session) {
		log.debug('CGetPlayerInfoReq')

		//if(!session.player_id) {
		//	return
		//}

		//var id = packet.readUInt32LE()

		// TODO: What is that? Always requested on begin round...

		/*
		var packet = new Packet(0x3A)
		packet.writeUInt64LE(session.player_id)
		packet.writeUInt64LE(0)
		packet.writeUInt64LE(0)
		packet.writeString("STRING1", 7)
		packet.writeString("NOOB", 4)
		session.write(packet.finalize())
		*/
	},
	handleNATInfoReq: function(packet, session) {
		log.debug('CNATInfoReq')

		if(!session.player_id) {
			return
		}

		session.player_private_ip = packet.readUInt32LE()
		session.player_private_port = packet.readUInt16LE()

		session.player_public_ip = packet.readUInt32LE()
		session.player_public_port = packet.readUInt16LE()

		// ignore public stuff from client
		session.player_public_ip = session.remoteAddress
		session.player_public_port = session.localPort//session.remotePort

		session.player_nat_unk = packet.readUInt16LE()
		session.player_connection_type = packet.readUInt8()
	},
	handleBuyItemRequest: function(packet, session) {
		log.debug('CBuyItemReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(session.room_id) {
			return
		}

		// TODO: Refresh PEN and AP here from DB?

		var count = packet.readUInt8()

		// More than 10 items at once can't be selected in the client...
		if(count > 10) {
			return session.write(Request.BuyItemAck(EBuyItemResult.DBError))
		}

		var items = []
		//var penCost = 0
        //var apCost = 0

		for(var i = 0; i < count; i++) {
			var item = {
				category: packet.readUInt8(),
				sub_category: packet.readUInt8(),
				item_id: packet.readUInt16LE(),
				product_id: packet.readUInt8(),
				effect_id: packet.readUInt32LE()
			}

			if(item.category === 5 && item.sub_category === 3 && count > 1) {
				return session.write(Request.BuyItemAck(EBuyItemResult.UnknownItem))
			}

			//penCost += shopItem.price
            //apCost += shopItem.cash

			items.push(item)
		}

		// Check if enough PEN and AP
		//if(session.pen < penCost || session.ap < apCost) {
        //	return session.write(Request.BuyItemAck(EBuyItemResult.NotEnoughMoney))
        //}

		async.series({
			save: function(callback) {
				async.mapSeries(items,
					function(item, callback) {
						// Fumbi capsule?
						if(item.category === 5 && item.sub_category === 3) {
							var penReward
							var apCost

							if(item.item_id === 1) { // Fumbi Capsule 1 | PEN Reward: 0 - 300 000
								penReward = _.random(0, 300000)
								apCost = 300
							} else if(item.item_id === 2) { // Fumbi Capsule 2 | PEN Reward: 0 - 1 000 000
								penReward = _.random(0, 1000000)
								apCost = 800
							} else {
								return callback(true, null)
							}

							db.Account.updateAP(session.player_id, -apCost)
							session.ap -= apCost

							session.write(Request.CashUpdateAck(session.pen, session.ap))

							db.Account.updatePEN(session.player_id, penReward)
							session.pen += penReward

							session.write(Request.BuyItemAck(EBuyItemResult.OK, penReward, item.item_id, item.category, item.sub_category, item.product_id, item.effect_id))
							return callback(null, null)
						}

						// Regular Item
						var category = item.category
						var sub_category = item.sub_category
						var item_id = item.item_id
						var product_id = item.product_id
						var effect_id = item.effect_id
						var sell_price = 10000
						var purchase_time = 23453454
						var expire_time = -1
						var energy = 2400
						var time_left = -1

						// TODO: Check if allowed to buy that item...
						//return session.write(Request.BuyItemAck(EBuyItemResult.UnknownItem))

						// TODO: Check if license is completed

						// TODO: Waste money

						db.Inventory.save({ account_id: session.player_id, category: category, sub_category: sub_category, item_id: item_id, product_id: product_id, effect_id: effect_id, expire_time: expire_time, time_used: 0, energy: energy }, function(err, result) {
							if(err) {
								session.write(Request.BuyItemAck(EBuyItemResult.DBError))
								return callback(true, null)
							}

							session.write(Request.InventoryAddItemAck(result._id, item_id, category, sub_category, product_id, effect_id, sell_price, purchase_time, expire_time, energy, time_left))
							session.write(Request.BuyItemAck(EBuyItemResult.OK, result._id, item_id, category, sub_category, product_id, effect_id))
							callback(null, null)
						})
					},
					function(err, result) {
					    callback(null, null)
					}
				)
			}
			/*
			updateMoney: function(callback) {
				session.write(Request.CashUpdateAck(session.pen, session.ap))
				callback(null, null)
			}
			*/
		}, function(err, result) {

		})
	},
	handleRefundItemRequest: function(packet, session) {
		log.debug('CRefundItemReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		var id = packet.readUInt64LE()

		// TODO: Check if the item isn't in use
		//return session.write(Request.ResultAck(EServerResult.FailResellItemWearing))

		// TODO: Special Case Items
		//return session.write(Request.RefundItemAck(ERefundItemResult.CantSell, id))

		db.Inventory.findByIDAndAccountID(id, session.player_id, function(err, item) {
			if(err) {
				return session.write(Request.ResultAck(EServerResult.ItemExchangeFailed))
			}

			// check if item exists
			if(!item) {
				return session.write(Request.ResultAck(EServerResult.ItemExchangeFailed))
			}

			item.remove(function(err) {
				if(err) {
					return session.write(Request.ResultAck(EServerResult.ItemExchangeFailed))
				}

				session.write(Request.RefundItemAck(ERefundItemResult.OK, id))
			})
		})
	},
	handleRepairItemRequest: function(packet, session) {
		log.debug('CRepairItemReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		var id = packet.readUInt64LE()

		session.write(Request.RepairItemAck(id))
	},
	handleRefreshItemsRequest: function(packet, session) {
		log.debug('CRefreshItemsReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		// TODO: Add items here which are expired...
		var items = []

		session.write(Request.RefreshInvalidateItemsAck(items))
	},
	handleRefreshEQItemsRequest: function(packet, session) {
		log.debug('CRefreshEQItemsReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		// TODO: Add items here which are expired...
		var items = []

		session.write(Request.RefreshInvalidateEQItemsAck(items))
	},
	handleClearInvalidateItemsRequest: function(packet, session) {
		log.debug('CClearInvalidateItemsReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		// TODO: Add items here which are expired... And remove from DB
		var items = []

		session.write(Request.ClearInvalidateItemsAck(items))
	},
	handleUseItemRequest: function(packet, session) {
		log.debug('CUseItemReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		var type = packet.readUInt8()
		var charSlot = packet.readUInt8()
		var eqSlot = packet.readUInt8()
		var id = packet.readUInt64LE()

		// Only the range between 0 and 2 is allowed
		if(charSlot < 0 && charSlot > 2) {
			return session.write(Request.ResultAck(EServerResult.DBError))
		}

		db.Inventory.findByIDAndAccountID(id, session.player_id, function(err, item) {
			if(err) {
				return session.write(Request.ResultAck(EServerResult.DBError))
			}

			// check if item exists
			if(!item) {
				return session.write(Request.ResultAck(EServerResult.DBError))
			}

			db.Character.findByAccountIDAndSlot(session.player_id, charSlot, function(err, character) {
				if(err) {
					return session.write(Request.ResultAck(EServerResult.DBError))
				}

				var value

				// Type
				switch(type) {
					case EItemUseType.Equip:
						value = id
						break
					case EItemUseType.Unequip:
						value = 0
						break
					default:
						return session.write(Request.ResultAck(EServerResult.GameServerError))
				}

				// category
				switch(item.category) {
					case EItemCategories.Clothes:
						switch(eqSlot) {
							case EItem.Hair:
								character.hair = value
								break
							case EItem.Face:
								character.face = value
								break
							case EItem.Shirt:
								character.shirt = value
								break
							case EItem.Pants:
								character.pants = value
								break
							case EItem.Gloves:
								character.gloves = value
								break
							case EItem.Shoes:
								character.shoes = value
								break
							case EItem.Special:
								character.special = value
								break
							default:
								return session.write(Request.ResultAck(EServerResult.GameServerError))
						}
						break
					case EItemCategories.Weapons:
						character['weapon_' + (eqSlot + 1)] = value
						break
					case EItemCategories.Skill:
						character.skill = value
						break
					case EItemCategories.Bonus:
						// TODO: EXP + is used for whole account, not just char ;o
						// character.bonus = value
						break
					default:
						return session.write(Request.ResultAck(EServerResult.GameServerError))
				}

				character.save(function(err) {
					if(err) {
						return session.write(Request.ResultAck(EServerResult.DBError))
					}

					// Set changed Item to char for Anti IDM Check ;)
					if(item.category === EItemCategories.Weapons) {
						var char = getCharacterBySlot(session.characters, charSlot)
						char['weapon_' + (eqSlot + 1)] = item
					}

					session.write(Request.UseItemAck(type, charSlot, eqSlot, id))
				})
			})
		})
	},
	handleRegisterLicenseRequest: function(packet, session) {
		log.debug('CRegisterLicenseReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(session.room_id) {
			return
		}

		var id = packet.readUInt8()

		// define allowed licenses
		var allowedLicenses = [
			ELicenseItem.PlasmaSword,
			ELicenseItem.CounterSword,
			ELicenseItem.SubmachineGun,
			ELicenseItem.Revolver,
			ELicenseItem.HeavyMachineGun,
			ELicenseItem.RailGun,
			ELicenseItem.Cannonade,
			ELicenseItem.SentryGun,
			ELicenseItem.MindEnergy,
			ELicenseItem.MindShock,
			ELicenseItem.Anchoring,
			ELicenseItem.Flying,
			ELicenseItem.Invisible,
			ELicenseItem.Detect,
			ELicenseItem.Shield,
			ELicenseItem.Block,
			ELicenseItem.Bind,
			ELicenseItem.SemiRifle,
			ELicenseItem.StormBat,
			ELicenseItem.GaussRifle,
			ELicenseItem.SentyNell,
			ELicenseItem.HandGun,
			ELicenseItem.SmashRifle
		]

		// check if the license is allowed
		if(allowedLicenses.indexOf(id) === -1) {
			return session.write(Request.ResultAck(EServerResult.GameServerError))
		}

		db.License.findByAccountIDAndLicenseID(session.player_id, id, function(err, result) {
			if(err) {
				return session.write(Request.ResultAck(EServerResult.DBError))
			}

			// check if the license is already saved
			if(result) {
				return // Yes, already saved
			}

			db.License.save({ account_id: session.player_id, license_id: id }, function(err, result) {
				if(err) {
					return session.write(Request.ResultAck(EServerResult.DBError))
				}

				session.write(Request.RefreshLicenseInfoAck(id))

				// TODO: Send 5h Item
			})
		})
	},
	handleLicenseCompletedRequest: function(packet, session) {
		log.debug('CLicenseCompletedReq')

		// TODO: Needed for? oO

		//if(!session.player_id) {
		//	return
		//}

		//if(session.room_id) {
		//	return
		//}

		//var id = packet.readUInt8()
	},
	handleCreateRoomRequest: function(packet, session) {
		log.debug('CCreateRoomReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(session.room_id) {
			return
		}

		if(!session.player_connection_type) {
			return session.write(Request.ResultAck(EServerResult.FailEnterRoom))
		}

		var room = []
		room.id = RoomHandler.createRoomID(session.channel_id)
		room.master_id = session.player_id
		room.players = []
		room.tunnel_id = RoomHandler.createTunnelID()
		room.channel_id = session.channel_id
		room.name = packet.readStringNT(31)
		room.matchKey = packet.readBuffer(4)
		room.mode = room.matchKey[0] >> 4
		room.map = room.matchKey[1]
		room.publicType = (room.matchKey[0] >> 1) & 1
        room.joinAuth = (room.matchKey[0] >> 2) & 1
		room.player_limit = room.matchKey[2]
		room.observers = room.matchKey[3]
		room.time_limit = packet.readUInt8() * (60 * 1000)
		room.score_limit = packet.readUInt8()
		room.unk = packet.readInt32LE() // ??
		room.password = packet.readUInt32LE()
		room.is_friendly = packet.readUInt8()
		room.is_balanced = packet.readUInt8()
		room.min_level = packet.readUInt8()
		room.max_level = packet.readUInt8()
		room.equip_limit = packet.readUInt8()
		room.is_no_intrusion = packet.readUInt8()
		room.state = EGameRuleState.Waiting
		room.ping = 100
		room.timeState = EGameTimeState.None

		RoomHandler.create(room, function(err) {
			if(err) {
				return session.write(Request.ResultAck(EServerResult.GameServerError))
			}

			RoomHandler.join(session, room.id, room.password, EPlayerGameMode.Normal)
		})
	},
	handleJoinTunnelRequest: function(packet, session) {
		log.debug('CJoinTunnelReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var slot = packet.readUInt8()

		session.write(Request.JoinTunnelAck(slot))
	},
	handleRoomPlayerEnter: function(packet, session) {
		log.debug('SCRoomPlayerEnter')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		if(!room) {
			return
		}

		session.write(RoomHandler.RoomChangeRefereeAck(room.master_id))
		session.write(RoomHandler.RoomChangeMasterAck(room.master_id))

		// master joined? Fake the behaviour for him so he can change the room settings instantly
		if(room.master_id === session.player_id) {
			session.write(RoomHandler.RoomChangeStateAck(EGameRuleState.Result))
			session.write(RoomHandler.RoomChangeStateAck(EGameRuleState.Waiting))
		}

		// TODO: I think this should be moved to RoomHandler.join... Together with connecting players
		var numAlpha = RoomHandler.countInTeam(room, ETeam.Alpha)
        var numBeta = RoomHandler.countInTeam(room, ETeam.Beta)

		if (numAlpha < numBeta) {
			session.team = ETeam.Alpha
		} else if (numAlpha > numBeta) {
			session.team = ETeam.Beta
		} else {
			session.team = ETeam.Alpha
		}

		session.gameMode = EPlayerGameMode.Normal

		session.isConnecting = false

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, this.RoomPlayerEnter(session))
		RoomHandler.broadcastBriefing(room)
	},
	handleEnterRoomRequest: function(packet, session) {
		log.debug('CEnterRoomReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(session.room_id) {
			return
		}

		if(!session.player_connection_type) {
			return session.write(Request.ResultAck(EServerResult.FailEnterRoom))
		}

		var id = packet.readUInt32LE()
		var password = packet.readUInt32LE()
		var game_mode = packet.readUInt8()

		RoomHandler.join(session, id, password, game_mode)
	},
	handleBeginRoundRequest: function(packet, session) {
		log.debug('CBeginRoundReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		if(!room) {
			return
		}

		if(session.player_id !== room.master_id) {
			return
		}

		// Only commented cause of develop purporses
		// TODO: countInTeamReady() and testing
		//if((RoomHandler.countInTeamReady(room, ETeam.Alpha) == 0 || RoomHandler.countInTeamReady(room, ETeam.Beta) == 0) && room.mode !== EGameRule.Survival) {
		//	return session.write(Request.EventMessageAck(EPlayerEventMessage.CantStartGame, session.player_id, 0, 0, ''))
        //}

		RoomHandler.beginRound(room)
	},
	handleRoomLeaveRequest: function(packet, session) {
		log.debug('CRoomLeaveReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		RoomHandler.leave(session, 0)
	},
	handleEventMessageRequest: function(packet, session) {
		log.debug('CEventMessageReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var event = packet.readUInt8()
		var id = packet.readUInt64LE()
		var unk1 = packet.readUInt32LE()
		var unk2 = packet.readUInt16LE()
		var strLen = packet.readUInt32LE()
		var str = (strLen > 0) ? packet.readString(strLen) : ''

		// define allowed event types
		var allowedEvents = [
			EPlayerEventMessage.BallReset,
			EPlayerEventMessage.StartGame
		]

		// check if the event is allowed
		if(allowedEvents.indexOf(event) === -1) {
			return log.warning('HAX - Unknown Event ' + event + '.')
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// Ball Reset Event
		if(event === EPlayerEventMessage.BallReset && session.player_id !== room.master_id) {
			return
		}

		// Start Game Event
		if(event === EPlayerEventMessage.StartGame && session.player_id !== id) {
			return
		}

		if(session.state === EPlayerState.Lobby && event === EPlayerEventMessage.StartGame && room.state !== EGameRuleState.Waiting) {
        	session.state = session.gameMode == EPlayerGameMode.Normal ? EPlayerState.Alive : EPlayerState.Spectating
        	session.score.joinTime = new Date().getTime()
    		//RoomHandler.broadcastBriefing(room)
        }

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, this.EventMessageAck(event, id, unk1, unk2, str))
	},
	handleRoomReadyRequest: function(packet, session) {
		log.debug('CRoomReadyReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var ready = packet.readUInt8()

		session.isReady = +!!ready

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.RoomReadyAck(session.player_id, session.isReady))
	},
	handleAdminShowWindowRequest: function(packet, session) {
		log.debug('CHandleAdminShowWindowReq')

		if(!session.player_id) {
			return
		}

		var allowed = 0
		if(session.gm_level > 0) {
			allowed = 1
		}

		session.write(Request.AdminShowWindowAck(allowed))
	},
	handleAdminActionRequest: function(packet, session) {
		log.debug('CAdminActionReq')

		if(!session.player_id) {
			return
		}

		// TODO: Rewrite that shit...

		// TODO: Make it per command
		if(session.gm_level < 0) {
			return this.close(session) // Hax detected
		}

		var command = packet.readStringNT()
		var command_splitted = command.split(' ')

		var code
		var i
		var id
		var notice
		var notice_length
		var room_id
		var room
		var player
		var text

		switch (command_splitted[0]) {
			case EAdminCommand.Ban:
				if(command_splitted[1]) {
					player = getPlayerByName(command_splitted[1], true)
					if(player) {
						if(player.gm_level === 0) {
							db.Account.saveBanned(player.player_id, -1)
							Request.close(player)
							text = Helper.getS4Color(0, 255, 0, 0) + player.player_name + ' successfully banned.'
						} else {
							text = Helper.getS4Color(255, 0, 0, 0) + player.player_name + ' is a GM.'
						}
					} else {
						text = Helper.getS4Color(255, 0, 0, 0) + command_splitted[1] + ' isn\'t online.'
					}
				} else {
					text = Helper.getS4Color(255, 0, 0, 0) + 'Please input a player name.'
				}
				break
			case EAdminCommand.GMRoom_Off:
				if(session.room_id) {
					room_id = session.room_id
				} else {
					room_id = parseInt(command_splitted[1])
				}
				if(room_id) {
					room = RoomHandler.getRoomByIDAndChannelID(room_id, session.channel_id)
					if(room) {
						RoomHandler.setGMRoom(room, false)
						text = Helper.getS4Color(0, 255, 0, 0) + 'Room #' + room_id + ' GM Room disabled.'
					} else {
						text = Helper.getS4Color(255, 0, 0, 0) + 'The Room with the ID ' + room_id + ' doesn\'t exist.'
					}
				} else {
					text = Helper.getS4Color(255, 0, 0, 0) + 'Please enter a Room ID or join a room.'
				}
				break
			case EAdminCommand.GMRoom_On:
				if(session.room_id) {
					room_id = session.room_id
				} else {
					room_id = parseInt(command_splitted[1])
				}
				if(room_id) {
					room = RoomHandler.getRoomByIDAndChannelID(room_id, session.channel_id)
					if(room) {
						RoomHandler.setGMRoom(room, true)
						text = Helper.getS4Color(0, 255, 0, 0) + 'Room #' + room_id + ' GM Room enabled.'
					} else {
						text = Helper.getS4Color(255, 0, 0, 0) + 'The Room with the ID ' + room_id + ' doesn\'t exist.'
					}
				} else {
					text = Helper.getS4Color(255, 0, 0, 0) + 'Please enter a Room ID or join a room.'
				}
				break
			case EAdminCommand.Kick:
				if(command_splitted[1]) {
					player = getPlayerByName(command_splitted[1], true)
					if(player) {
						if(player.player_id === session.player_id) {
							text = Helper.getS4Color(255, 0, 0, 0) + 'You can\'t kick yourself.'
						} else {
							Request.close(player)
							text = Helper.getS4Color(0, 255, 0, 0) + player.player_name + ' successfully kicked.'
						}
					} else {
						text = Helper.getS4Color(255, 0, 0, 0) + command_splitted[1] + ' isn\'t online.'
					}
				} else {
					text = Helper.getS4Color(255, 0, 0, 0) + 'Please input a player name.'
				}
				break
			case EAdminCommand.Master:
				if(command_splitted[1]) {
					player = getPlayerByName(command_splitted[1], true)
					if(player) {
						if(session.channel_id === player.channel_id && session.room_id === player.room_id) {
							room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)
							if(room.master_id !== player.player_id) {
								RoomHandler.setMaster(room, player)
								text = Helper.getS4Color(0, 255, 0, 0) + player.player_name + ' is now Master.'
							} else {
								text = Helper.getS4Color(255, 0, 0, 0) + player.player_name + ' is already Master.'
							}
						} else {
							text = Helper.getS4Color(255, 0, 0, 0) + player.player_name + ' isn\'t in the room.'
						}
					} else {
						text = Helper.getS4Color(255, 0, 0, 0) + command_splitted[1] + ' isn\'t online.'
					}
				} else {
					if(session.room_id) {
						room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)
						if(room.master_id !== session.player_id) {
							RoomHandler.setMaster(room, session)
							text = Helper.getS4Color(0, 255, 0, 0) + 'You are now Master.'
						} else {
							text = Helper.getS4Color(255, 0, 0, 0) + 'You are already Master.'
						}
					} else {
						text = Helper.getS4Color(255, 0, 0, 0) + 'You need to be in a room.'
					}
				}
				break
		    case EAdminCommand.Notice:
				if(session.channel_id) {
					notice = ''
					notice_length = command_splitted.length
					for(i = 1; i < notice_length; i++) {
						notice += command_splitted[i] + ' '
					}
					if(notice === '') {
						text = Helper.getS4Color(255, 0, 0, 0) + 'Please input a text.'
					} else {
						ChannelHandler.broadcastToChannel(session.channel_id, this.NoticeAck(notice))
						text = Helper.getS4Color(0, 255, 0, 0) + 'Notice to Channel ' + session.channel_id + ' successfully sent.'
					}
				} else {
					text = Helper.getS4Color(255, 0, 0, 0) + 'You aren\'t in a channel. Please join a channel first or use /whole_notice instead.'
				}
		        break
			case EAdminCommand.Reset:
				if(session.room_id) {
					room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)
					if(room.state === EGameRuleState.Playing && room.timeState !== EGameTimeState.HalfTime && (room.mode === EGameRule.Touchdown || room.mode === EGameRule.Deathmatch)) {
					    RoomHandler.broadcastToRoom(session.channel_id, session.room_id, this.EventMessageAck(EPlayerEventMessage.ResetRound, 0, 0, 0, ''))
						text = Helper.getS4Color(0, 255, 0, 0) + ' Room resetted.'
					} else {
						text = Helper.getS4Color(255, 0, 0, 0) + ' Not possible to reset the room.'
					}
				} else {
					text = Helper.getS4Color(255, 0, 0, 0) + ' You need to be in a running game.'
				}
				break
			case EAdminCommand.Roomkick:
				if(command_splitted[1]) {
					player = getPlayerByName(command_splitted[1], true)
					if(player) {
						if(player.room_id) {
							text = Helper.getS4Color(0, 255, 0, 0) + player.player_name + ' successfully kicked from room ' + player.room_id + '.'
							RoomHandler.leave(player, 4)
						} else {
							text = Helper.getS4Color(255, 0, 0, 0) + player.player_name + ' isn\'t in a room.'
						}
					} else {
						text = Helper.getS4Color(255, 0, 0, 0) + command_splitted[1] + ' isn\'t online.'
					}
				} else {
					text = Helper.getS4Color(255, 0, 0, 0) + 'Please input a player name.'
				}
				break
			case EAdminCommand.Room_close:
				if(session.channel_id) {
					if(command_splitted[1]) {
						room = RoomHandler.getRoomByIDAndChannelID(parseInt(command_splitted[1]), session.channel_id)
						if(room) {
							RoomHandler.leaveAll(room.players)
							text = Helper.getS4Color(0, 255, 0, 0) + 'Room #' + command_splitted[1] + ' successfully closed.'
						} else {
							text = Helper.getS4Color(255, 0, 0, 0) + 'Room #' + command_splitted[1] + '" doesn\'t exist.'
						}
					} else {
						if(session.room_id) {
							room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)
							RoomHandler.leaveAll(room.players)
							text = Helper.getS4Color(0, 255, 0, 0) + 'Room #' + session.room_id + ' successfully closed.'
						} else {
							text = Helper.getS4Color(255, 0, 0, 0) + 'You need to be in a room.'
						}
					}
				} else {
					text = Helper.getS4Color(255, 0, 0, 0) + 'You aren\'t in a channel.'
				}
				break
			case EAdminCommand.Search:
				if(command_splitted[1]) {
					player = getPlayerByName(command_splitted[1], true)
					if(player) {
						if(player.channel_id) {
							if(player.room_id) {
								text = Helper.getS4Color(0, 255, 0, 0) + player.player_name + ' is in channel ' + player.channel_id + ' in Room ' + player.room_id + '.'
							} else {
								text = Helper.getS4Color(0, 255, 0, 0) + player.player_name + ' is in channel ' + player.channel_id + '.'
							}
						} else {
							text = Helper.getS4Color(0, 255, 0, 0) + player.player_name + ' is online and in no channel.'
						}
						text += ' GM Level: ' + player.gm_level + ' | Connection Type: ' + player.player_connection_type
					} else {
						text = Helper.getS4Color(255, 0, 0, 0) + command_splitted[1] + ' isn\'t online.'
					}
				} else {
					text = Helper.getS4Color(255, 0, 0, 0) + 'Please input a player name.'
				}
				break
			case EAdminCommand.Stop:
				log.info('Game Server have been stopped by a GM')
				process.exit()
				break
			case EAdminCommand.TD:
				if(command_splitted[1]) {
					if(session.room_id) {
						player = getPlayerByName(command_splitted[1], true)
						if(player) {
							if(session.channel_id === player.channel_id && session.room_id === player.room_id) {
								this.TouchdownHandler(session, player.player_id)
								text = Helper.getS4Color(0, 255, 0, 0) + player.player_name + ' scored a Touchdown.'
							} else {
								text = Helper.getS4Color(255, 0, 0, 0) + player.player_name + ' isn\'t in your room.'
							}
						} else {
							text = Helper.getS4Color(255, 0, 0, 0) + command_splitted[1] + ' isn\'t online.'
						}
					} else {
						text = Helper.getS4Color(255, 0, 0, 0) + ' You need to be in a room.'
					}
				} else {
					if(session.room_id) {
						this.TouchdownHandler(session, session.player_id)
						text = Helper.getS4Color(0, 255, 0, 0) + 'You scored a Touchdown.'
					} else {
						text = Helper.getS4Color(255, 0, 0, 0) + 'You need to be in a room.'
					}
				}
				break
			case EAdminCommand.Unban:
				text = Helper.getS4Color(255, 0, 0, 0) + 'Not yet implemented.'
				break
			case EAdminCommand.WholeNotice:
				notice = ''
				notice_length = command_splitted.length
				for(i = 1; i < notice_length; i++) {
					notice += command_splitted[i] + ' '
				}
				if(notice === '') {
					text = Helper.getS4Color(255, 0, 0, 0) + 'Please input a text.'
				} else {
					broadcast(this.NoticeAck(notice))
					text = Helper.getS4Color(0, 255, 0, 0) + 'Notice to all channels successfully sent.'
				}
		        break
			case '/clan':
				session.write(Request.ClanInfoAck())
				text = Helper.getS4Color(0, 255, 0, 0) + 'Success.'
				break
			case '/result':
				code = command_splitted[1]
				session.write(this.ResultAck(code))
				text = Helper.getS4Color(0, 255, 0, 0) + 'Result with Code ' + code + ' successfully sent.'
				break
			case '/debug':
				id = parseInt(command_splitted[1])
				packet = new Packet(id)
				packet.writeUInt8(0)
				packet.writeUInt8(1)
				packet.writeUInt8(2)
				packet.writeUInt8(3)
				packet.writeUInt8(4)
				packet.writeUInt8(5)
				packet.writeUInt8(6)
				packet.writeUInt8(7)
				packet.writeUInt8(8)
				packet.writeUInt8(9)
				packet.writeUInt8(10)
				packet.writeUInt8(11)
				packet.writeUInt8(12)
				packet.writeUInt8(13)
				packet.writeUInt8(14)
				packet.writeUInt8(15)
				packet.writeUInt8(16)
				packet.writeUInt8(17)
				packet.writeUInt8(18)
				packet.writeUInt8(19)
				packet.writeUInt8(20)
				packet.writeUInt8(21)
				packet.writeUInt8(22)
				packet.writeUInt8(23)
				packet.writeUInt8(24)
				packet.writeUInt8(25)
				packet.writeUInt8(26)
				packet.writeUInt8(27)
				packet.writeUInt8(28)
				packet.writeUInt8(29)
				packet.writeUInt8(30)
				packet.writeUInt8(31)
				packet.writeUInt8(32)
				packet.writeUInt8(33)
				packet.writeUInt8(34)
				packet.writeUInt8(35)
				packet.writeUInt8(36)
				packet.writeUInt8(37)
				packet.writeUInt8(38)
				packet.writeUInt8(39)
				packet.writeUInt8(40)
				packet.writeUInt8(41)
				packet.writeUInt8(42)
				packet.writeUInt8(43)
				packet.writeUInt8(44)
				packet.writeUInt8(45)
				packet.writeUInt8(46)
				packet.writeUInt8(47)
				packet.writeUInt8(48)
				packet.writeUInt8(49)
				packet.writeUInt8(50)
				packet.writeUInt8(51)
				packet.writeUInt8(52)
				packet.writeUInt8(53)
				packet.writeUInt8(54)
				packet.writeUInt8(55)
				packet.writeUInt8(56)
				packet.writeUInt8(57)
				packet.writeUInt8(58)
				packet.writeUInt8(59)
				packet.writeUInt8(60)
				session.write(packet.finalize())
				text = Helper.getS4Color(0, 255, 0, 0) + 'Debug Packet ID # ' + id + 'sent.'
				break
			case '/event':
				code = parseInt(command_splitted[1])
				RoomHandler.broadcastToRoom(session.channel_id, session.room_id, this.EventMessageAck(20, code, code, code, code + ''))
				text = Helper.getS4Color(0, 255, 0, 0) + 'Event with Code ' + code + ' successfully sent.'
				break
			case '/finish':
				room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)
				RoomHandler.beginResult(room)
				text = Helper.getS4Color(0, 255, 0, 0) + 'Room finished.'
				break
			case '/kill':
				room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)
				RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreKillAck(1, 1, 15, 1, 1))
				RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreKillAck(1, 0, 15, 1, 1))
				RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreKillAck(1, 0, 15, 0, 1))
				RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreKillAck(1, 0, 15, 0, 0))
				text = Helper.getS4Color(0, 255, 0, 0) + 'Done.'
				break
			default:
				text = Helper.getS4Color(255, 0, 0, 0) + 'Command not found: ' + command_splitted[0]
		}

		session.write(this.AdminActionAck(text))

		db.Command.save({ account_id: session.player_id, text: command })
	},
	handleScoreKillRequest: function(packet, session) {
		log.debug('CScoreKillReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		// READ

		var murderID = 0
		var murderAssistID
		var weaponID
		var victimID = 0
		var victimAssistID

		var victimIsWeapon = false

		// Try to read the murder...
		try {
			murderID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got a Senty/Sentry kill
			packet.rewind(8)
			murderID = packet.readBuffer(8)
		}

		murderAssistID = packet.readUInt64LE() // Used with installation weapon

		weaponID = packet.readUInt32LE()

		// Try to read the Victim
		try {
			victimID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got killed by a Senty/Sentry
			packet.rewind(8)
			victimID = packet.readBuffer(8)
		}

		victimAssistID = packet.readUInt64LE() // Used with installation weapon

		// PROCESS

		var murder

		if(murderID instanceof Buffer) {
			murder = getPlayerByID(murderAssistID)
		} else {
			murder = getPlayerByID(murderID)
		}
		if(!murder) {
			return
		}

		// check if murder is with the session in the same room
		if(session.room_id !== murder.room_id || session.channel_id !== murder.channel_id) {
			return
		}

		var victim

		if(victimID instanceof Buffer) {
			victim = getPlayerByID(victimAssistID)

			victimIsWeapon = true
		} else {
			victim = getPlayerByID(victimID)
		}
		if(!victim) {
			return
		}

		// check if victim is the session (sender)
		if(victim.player_id !== session.player_id) {
			return
		}

		// check if murder and victim are in the same room
		if(murder.room_id !== victim.room_id || murder.channel_id !== victim.channel_id) {
			return
		}

		// check if murder and victim are not in the same team
		if(murder.team === victim.team) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// check if room is not waiting or in half time
		if(room.state != EGameRuleState.Playing || room.timeState == EGameTimeState.HalfTime) {
		    return
		}

		// check if room is TDWaiting
		if(room.TDWaiting) {
			return
		}

		if(!Request.validateKillWeapon(murder, weaponID)) {
			log.debug('HAX - Player ' + murder.player_name+ ' used IDM!')
			return
		}

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreKillAck(murderID, murderAssistID, weaponID, victimID, victimAssistID))

		if(victimIsWeapon) {
			return
		}

		switch (room.mode) {
            case EGameRule.Touchdown:
				murder.score.totalPoints += 2
				murder.td.killPoints++
				break
			case EGameRule.Deathmatch:
            	murder.score.totalPoints += 2
                murder.dm.killPoints++

				victim.dm.deaths++

                if(murder.team == ETeam.Alpha) {
                	room.scoreAlpha++
                } else {
                	room.scoreBeta++
				}
                break
			default:
				// ...
				break
		}
	},
	handleScoreKillAssistRequest: function(packet, session) {
		log.debug('SScoreKillAssistReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		// READ

		var murderID
		var murderAssistID
		var assistID
		var assistAssistID
		var weaponID
		var victimID
		var victimAssistID

		var victimIsWeapon = false

		// Try to read the murder...
		try {
			murderID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got a Senty/Sentry kill
			packet.rewind(8)
			murderID = packet.readBuffer(8)
		}

		murderAssistID = packet.readUInt64LE() // Used with installation weapon

		// Try to read the assist...
		try {
			assistID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got a Senty/Sentry kill
			packet.rewind(8)
			assistID = packet.readBuffer(8)
		}

		assistAssistID = packet.readUInt64LE() // Used with installation weapon

		weaponID = packet.readUInt32LE()

		// Try to read the Victim
		try {
			victimID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got killed by a Senty/Sentry
			packet.rewind(8)
			victimID = packet.readBuffer(8)
		}

		victimAssistID = packet.readUInt64LE() // Used with installation weapon

		// PROCESS

		var murder

		if(murderID instanceof Buffer) {
			murder = getPlayerByID(murderAssistID)
		} else {
			murder = getPlayerByID(murderID)
		}
		if(!murder) {
			return
		}

		// check if murder is with the session in the same room
		if(session.room_id !== murder.room_id || session.channel_id !== murder.channel_id) {
			return
		}

		var assist

		if(assistID instanceof Buffer) {
			assist = getPlayerByID(assistAssistID)
		} else {
			assist = getPlayerByID(assistID)
		}
		if(!assist) {
			return
		}

		// check if murder and assist are in the same room
		if(murder.room_id !== assist.room_id || murder.channel_id !== assist.channel_id) {
			return
		}

		// check if murder and assist are in the same team
		if(murder.team !== assist.team) {
			return
		}

		var victim

		if(victimID instanceof Buffer) {
			victim = getPlayerByID(victimAssistID)

			victimIsWeapon = true
		} else {
			victim = getPlayerByID(victimID)
		}
		if(!victim) {
			return
		}

		// check if victim is the session (sender)
		if(victim.player_id !== session.player_id) {
			return
		}

		// check if murder and victim are in the same room
		if(murder.room_id !== victim.room_id || murder.channel_id !== victim.channel_id) {
			return
		}

		// check if murder and victim are not in the same team
		if(murder.team === victim.team) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// check if room is not waiting or in half time
		if(room.state != EGameRuleState.Playing || room.timeState == EGameTimeState.HalfTime) {
		    return
		}

		// check if room is TDWaiting
		if(room.TDWaiting) {
			return
		}

		if(!Request.validateKillWeapon(murder, weaponID)) {
			log.debug('HAX - Player ' + murder.player_name+ ' used IDM!')
			return
		}

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreKillAssistAck(murderID, murderAssistID, assistID, assistAssistID, weaponID, victimID, victimAssistID))

		if(victimIsWeapon) {
			return
		}

		switch (room.mode) {
    		case EGameRule.Touchdown:
				murder.score.totalPoints += 2
				murder.td.killPoints++

                assist.score.totalPoints += 1
                assist.td.killAssistPoints++
                break
            case EGameRule.Deathmatch:
				murder.score.totalPoints += 2
                murder.dm.killPoints++

                assist.score.totalPoints += 1
				assist.dm.killAssistPoints++

                victim.dm.deaths++

                if(murder.team == ETeam.Alpha) {
                	room.scoreAlpha++
                } else {
                	room.scoreBeta++
				}
                break
			default:
				// ...
				break
        }
	},
	handleReboundFumbiRequest: function(packet, session) {
		log.debug('CReboundFumbiReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var new_id = packet.readUInt64LE()
		var old_id = packet.readUInt64LE()

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// check if room is not waiting or in half time
		if(room.state != EGameRuleState.Playing || room.timeState == EGameTimeState.HalfTime) {
		    return
		}

		// check if the user is room master
		if(session.player_id !== room.master_id) {
			return
		}

		// check if room is TDWaiting
		if(room.TDWaiting) {
			return
		}

		// check if room is TD
		if(room.mode !== EGameRule.Touchdown) {
			return
		}

		// Only get it when its defined
		if(old_id !== 0) {
			var oldPlayer = getPlayerByID(old_id)
		}

		if(old_id !== 0 && oldPlayer.team === ETeam.Alpha) {
        	room.lastAlphaFumbi = new Date().getTime()
			room.lastAlphaFumbiID = old_id
        } else if(old_id !== 0 && oldPlayer.team === ETeam.Beta) {
            room.lastBetaFumbi = new Date().getTime()
        	room.lastBetaFumbiID = old_id
        }

		var newPlayer = getPlayerByID(new_id)
		if(!newPlayer) {
			return
		}

		// check if newPlayer is with the session in the same room
		if(session.room_id !== newPlayer.room_id || session.channel_id !== newPlayer.channel_id) {
			return
		}

		newPlayer.score.totalPoints += 2
		newPlayer.td.fumbi++

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ReboundFumbiAck(new_id, old_id))
	},
	handleTouchdown: function(packet, session) {
		log.debug('SCTouchdown')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		var id = packet.readUInt64LE()

		this.TouchdownHandler(session, id)
	},
	handleScoreSuicideRequest: function(packet, session) {
		log.debug('CScoreSuicideReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var id = packet.readUInt64LE()
		var unk1 = packet.readUInt64LE() // not sure
		var unk2 = packet.readUInt32LE() // weapon id?

		var player = getPlayerByID(id)
		if(!player) {
			return
		}

		// check if player is with the session in the same room
		if(session.room_id !== player.room_id || session.channel_id !== player.channel_id) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// check if room is not waiting or in half time
		if(room.state != EGameRuleState.Playing || room.timeState == EGameTimeState.HalfTime) {
		    return
		}

		if(room.mode === EGameRule.Deathmatch) {
			player.dm.deaths++
		} else if(room.mode === EGameRule.Touchdown) {
			player.td.deaths++
		}

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreSuicideAck(id, unk1, unk2))
	},
	handleScoreOffenseRequest: function(packet, session) {
		log.debug('CScoreOffenseReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		// READ

		var murderID = 0
		var murderAssistID
		var weaponID
		var victimID = 0
		var victimAssistID

		var victimIsWeapon = false

		// Try to read the murder...
		try {
			murderID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got a Senty/Sentry kill
			packet.rewind(8)
			murderID = packet.readBuffer(8)
		}

		murderAssistID = packet.readUInt64LE() // Used with installation weapon

		weaponID = packet.readUInt32LE()

		// Try to read the Victim
		try {
			victimID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got killed by a Senty/Sentry
			packet.rewind(8)
			victimID = packet.readBuffer(8)
		}

		victimAssistID = packet.readUInt64LE() // Used with installation weapon

		// PROCESS

		var murder

		if(murderID instanceof Buffer) {
			murder = getPlayerByID(murderAssistID)
		} else {
			murder = getPlayerByID(murderID)
		}
		if(!murder) {
			return
		}

		// check if murder is with the session in the same room
		if(session.room_id !== murder.room_id || session.channel_id !== murder.channel_id) {
			return
		}

		var victim

		if(victimID instanceof Buffer) {
			victim = getPlayerByID(victimAssistID)

			victimIsWeapon = true
		} else {
			victim = getPlayerByID(victimID)
		}
		if(!victim) {
			return
		}

		// check if victim is the session (sender)
		if(victim.player_id !== session.player_id) {
			return
		}

		// check if murder and victim are in the same room
		if(murder.room_id !== victim.room_id || murder.channel_id !== victim.channel_id) {
			return
		}

		// check if murder and victim are not in the same team
		if(murder.team === victim.team) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// check if room is not waiting or in half time
		if(room.state != EGameRuleState.Playing || room.timeState == EGameTimeState.HalfTime) {
		    return
		}

		// check if room is TD
		if(room.mode !== EGameRule.Touchdown) {
			return
		}

		// check if room is TDWaiting
		if(room.TDWaiting) {
			return
		}

		if(!Request.validateKillWeapon(murder, weaponID)) {
			log.debug('HAX - Player ' + murder.player_name+ ' used IDM!')
			return
		}

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreOffenseAck(murderID, murderAssistID, weaponID, victimID, victimAssistID))

		if(victimIsWeapon) {
			return
		}

        murder.score.totalPoints += 4
		murder.td.offensePoints++
	},
	handleScoreOffenseAssistRequest: function(packet, session) {
		log.debug('CScoreOffenseAssistReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		// READ

		var murderID = 0
		var murderAssistID
		var assistID = 0
		var assistAssistID
		var weaponID
		var victimID = 0
		var victimAssistID

		var victimIsWeapon = false

		// Try to read the murder...
		try {
			murderID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got a Senty/Sentry kill
			packet.rewind(8)
			murderID = packet.readBuffer(8)
		}

		murderAssistID = packet.readUInt64LE() // Used with installation weapon

		// Try to read the assist...
		try {
			assistID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got a Senty/Sentry kill
			packet.rewind(8)
			assistID = packet.readBuffer(8)
		}

		assistAssistID = packet.readUInt64LE() // Used with installation weapon

		weaponID = packet.readUInt32LE()

		// Try to read the Victim
		try {
			victimID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got killed by a Senty/Sentry
			packet.rewind(8)
			victimID = packet.readBuffer(8)
		}

		victimAssistID = packet.readUInt64LE() // Used with installation weapon

		// PROCESS

		var murder

		if(murderID instanceof Buffer) {
			murder = getPlayerByID(murderAssistID)
		} else {
			murder = getPlayerByID(murderID)
		}
		if(!murder) {
			return
		}

		// check if murder is with the session in the same room
		if(session.room_id !== murder.room_id || session.channel_id !== murder.channel_id) {
			return
		}

		var assist

		if(assistID instanceof Buffer) {
			assist = getPlayerByID(assistAssistID)
		} else {
			assist = getPlayerByID(assistID)
		}
		if(!assist) {
			return
		}

		// check if murder and assist are in the same room
		if(murder.room_id !== assist.room_id || murder.channel_id !== assist.channel_id) {
			return
		}

		// check if murder and assist are in the same team
		if(murder.team !== assist.team) {
			return
		}

		var victim

		if(victimID instanceof Buffer) {
			victim = getPlayerByID(victimAssistID)

			victimIsWeapon = true
		} else {
			victim = getPlayerByID(victimID)
		}
		if(!victim) {
			return
		}

		// check if victim is the session (sender)
		if(victim.player_id !== session.player_id) {
			return
		}

		// check if murder and victim are in the same room
		if(murder.room_id !== victim.room_id || murder.channel_id !== victim.channel_id) {
			return
		}

		// check if murder and victim are not in the same team
		if(murder.team === victim.team) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// check if room is not waiting or in half time
		if(room.state != EGameRuleState.Playing || room.timeState == EGameTimeState.HalfTime) {
		    return
		}

		// check if room is TD
		if(room.mode !== EGameRule.Touchdown) {
			return
		}

		// check if room is TDWaiting
		if(room.TDWaiting) {
			return
		}

		if(!Request.validateKillWeapon(murder, weaponID)) {
			log.debug('HAX - Player ' + murder.player_name+ ' used IDM!')
			return
		}

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreOffenseAssistAck(murderID, murderAssistID, assistID, assistAssistID, weaponID, victimID, victimAssistID))

		if(victimIsWeapon) {
			return
		}

		murder.score.totalPoints += 4
		murder.td.offensePoints++

        assist.score.totalPoints += 2
		assist.td.offenseAssistPoints++
	},
	handleScoreDefenseRequest: function(packet, session) {
		log.debug('CScoreDefenseReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		// READ

		var murderID = 0
		var murderAssistID
		var weaponID
		var victimID = 0
		var victimAssistID

		var victimIsWeapon = false

		// Try to read the murder...
		try {
			murderID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got a Senty/Sentry kill
			packet.rewind(8)
			murderID = packet.readBuffer(8)
		}

		murderAssistID = packet.readUInt64LE() // Used with installation weapon

		weaponID = packet.readUInt32LE()

		// Try to read the Victim
		try {
			victimID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got killed by a Senty/Sentry
			packet.rewind(8)
			victimID = packet.readBuffer(8)
		}

		victimAssistID = packet.readUInt64LE() // Used with installation weapon

		// PROCESS

		var murder

		if(murderID instanceof Buffer) {
			murder = getPlayerByID(murderAssistID)
		} else {
			murder = getPlayerByID(murderID)
		}
		if(!murder) {
			return
		}

		// check if murder is with the session in the same room
		if(session.room_id !== murder.room_id || session.channel_id !== murder.channel_id) {
			return
		}

		var victim

		if(victimID instanceof Buffer) {
			victim = getPlayerByID(victimAssistID)

			victimIsWeapon = true
		} else {
			victim = getPlayerByID(victimID)
		}
		if(!victim) {
			return
		}

		// check if victim is the session (sender)
		if(victim.player_id !== session.player_id) {
			return
		}

		// check if murder and victim are in the same room
		if(murder.room_id !== victim.room_id || murder.channel_id !== victim.channel_id) {
			return
		}

		// check if murder and victim are not in the same team
		if(murder.team === victim.team) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// check if room is not waiting or in half time
		if(room.state != EGameRuleState.Playing || room.timeState == EGameTimeState.HalfTime) {
		    return
		}

		// check if room is TD
		if(room.mode !== EGameRule.Touchdown) {
			return
		}

		// check if room is TDWaiting
		if(room.TDWaiting) {
			return
		}

		if(!Request.validateKillWeapon(murder, weaponID)) {
			log.debug('HAX - Player ' + murder.player_name+ ' used IDM!')
			return
		}

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreDefenseAck(murderID, murderAssistID, weaponID, victimID, victimAssistID))

		if(victimIsWeapon) {
			return
		}

		murder.score.totalPoints += 4
		murder.td.defensePoints++
	},
	handleScoreDefenseAssistRequest: function(packet, session) {
		log.debug('CScoreDefenseAssistReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		// READ

		var murderID = 0
		var murderAssistID
		var assistID = 0
		var assistAssistID
		var weaponID
		var victimID = 0
		var victimAssistID

		var victimIsWeapon = false

		// Try to read the murder...
		try {
			murderID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got a Senty/Sentry kill
			packet.rewind(8)
			murderID = packet.readBuffer(8)
		}

		murderAssistID = packet.readUInt64LE() // Used with installation weapon

		// Try to read the assist...
		try {
			assistID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got a Senty/Sentry kill
			packet.rewind(8)
			assistID = packet.readBuffer(8)
		}

		assistAssistID = packet.readUInt64LE() // Used with installation weapon

		weaponID = packet.readUInt32LE()

		// Try to read the Victim
		try {
			victimID = packet.readUInt64LE()
		} catch(e) {
			// Nope, we've got killed by a Senty/Sentry
			packet.rewind(8)
			victimID = packet.readBuffer(8)
		}

		victimAssistID = packet.readUInt64LE() // Used with installation weapon

		// PROCESS

		var murder

		if(murderID instanceof Buffer) {
			murder = getPlayerByID(murderAssistID)
		} else {
			murder = getPlayerByID(murderID)
		}
		if(!murder) {
			return
		}

		// check if murder is with the session in the same room
		if(session.room_id !== murder.room_id || session.channel_id !== murder.channel_id) {
			return
		}

		var assist

		if(assistID instanceof Buffer) {
			assist = getPlayerByID(assistAssistID)
		} else {
			assist = getPlayerByID(assistID)
		}
		if(!assist) {
			return
		}

		// check if murder and assist are in the same room
		if(murder.room_id !== assist.room_id || murder.channel_id !== assist.channel_id) {
			return
		}

		// check if murder and assist are in the same team
		if(murder.team !== assist.team) {
			return
		}

		var victim

		if(victimID instanceof Buffer) {
			victim = getPlayerByID(victimAssistID)

			victimIsWeapon = true
		} else {
			victim = getPlayerByID(victimID)
		}
		if(!victim) {
			return
		}

		// check if victim is the session (sender)
		if(victim.player_id !== session.player_id) {
			return
		}

		// check if murder and victim are in the same room
		if(murder.room_id !== victim.room_id || murder.channel_id !== victim.channel_id) {
			return
		}

		// check if murder and victim are not in the same team
		if(murder.team === victim.team) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// check if room is not waiting or in half time
		if(room.state != EGameRuleState.Playing || room.timeState == EGameTimeState.HalfTime) {
		    return
		}

		// check if room is TD
		if(room.mode !== EGameRule.Touchdown) {
			return
		}

		// check if room is TDWaiting
		if(room.TDWaiting) {
			return
		}

		if(!Request.validateKillWeapon(murder, weaponID)) {
			log.debug('HAX - Player ' + murder.player_name+ ' used IDM!')
			return
		}

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreDefenseAssistAck(murderID, murderAssistID, assistID, assistAssistID, weaponID, victimID, victimAssistID))

		if(victimIsWeapon) {
			return
		}

		murder.score.totalPoints += 4
		murder.td.defensePoints++

        assist.score.totalPoints += 2
		assist.td.defenseAssistPoints++
	},
	handleScoreHealRequest: function(packet, session) {
		log.debug('CScoreHealReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var id = packet.readUInt64LE()
		var unk = packet.readUInt64LE()

		var healer = getPlayerByID(id)
		if(!healer) {
			return
		}

		// check if healer is with the session in the same room
		if(session.room_id !== healer.room_id || session.channel_id !== healer.channel_id) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// check if room is not waiting or in half time
		if(room.state != EGameRuleState.Playing || room.timeState == EGameTimeState.HalfTime) {
		    return
		}

		if(!Request.validateKillWeapon(healer, 15, true)) {
			log.debug('HAX - Player ' + healer.player_name+ ' used IDM!')
			return
		}

		// check room for allowed modes
		if(room.mode === EGameRule.Touchdown) {
			// check if room is TDWaiting
			if(room.TDWaiting) {
				return
			}
			healer.td.healPoints++
		} else if(room.mode === EGameRule.Deathmatch) {
			healer.dm.healPoints++
		} else {
			return
		}

		healer.score.totalPoints += 2

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreHealAssistAck(id, unk))
		//RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreKillAck(id, 43545, 15, 0, 0))
	},
	handleChangeTeamRequest: function(packet, session) {
		log.debug('CChangeTeamReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)
		if(room.state !== EGameRuleState.Waiting) {
			return
		}

		var to_team = packet.readUInt8()
		//var game_mode = packet.readUInt8() // Not needed atm

		var numPlayers

		if(to_team === ETeam.Alpha) {
			numPlayers = RoomHandler.countInTeam(room, ETeam.Alpha, session.gameMode)
		} else if(to_team === ETeam.Beta) {
			numPlayers = RoomHandler.countInTeam(room, ETeam.Beta, session.gameMode)
		} else {
			return
		}

		var limit = session.gameMode == EPlayerGameMode.Normal ? room.player_limit / 2 : room.observers / 2
        if (numPlayers >= limit) {
			return // full
		}

		session.team = to_team

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ChangeTeamAck(session.player_id, session.team, session.gameMode))
	},
	handleRoomKickRequest: function(packet, session) {
		log.debug('CRoomKickReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var id = packet.readUInt64LE()
		var type = packet.readUInt8() // Ignore that, fuck off afk leave feature... Otherwise it's a security hole

		// Ignore AFK Kick shits from client for preventing kick hack
		if(type !== 1) {
			return
		}

		// check if the room is waiting
		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)
		if(room.state !== EGameRuleState.Waiting) {
			return
		}

		// check if the user is room master
		if(session.player_id !== room.master_id) {
			return
		}

		// check if the target is in the room
		var target = getPlayerByID(id)
		if(target.room_id !== session.room_id) {
			return
		}

		// check if the target isn't GM
		if(target.gm_level) {
			return
		}

		RoomHandler.leave(target, 1)
	},
	handleRandomshopRequest: function(packet, session) {
		log.debug('CRandomshopReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(session.room_id) {
			return
		}

		// If you are lazy
		return session.write(this.ResultAck(EServerResult.GameServerError))

		//var category = packet.readUInt8()
		//var type = packet.readUInt8()

		// TODO: Doesn't work ;o
		//session.write(Request.RandomshopItemInfoAck())
		//session.write(Request.RandomshopChanceInfoAck())
	},
	handleLogoutRequest: function(packet, session) {
		log.debug('CLogoutReq')

		if(!session.player_id) {
			return
		}

		session.write(Request.LogoutAck())
	},
	handleRoomChangeItemsRequest: function(packet, session) {
		log.debug('CRoomChangeItemsReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var id = packet.readUInt64LE()
		var skill = packet.readUInt32LE()
		var skill2 = packet.readUInt32LE()
		var weapon1 = packet.readUInt32LE()
		var weapon2 = packet.readUInt32LE()
		var weapon3 = packet.readUInt32LE()
		var unk = packet.readBuffer(27)

		// TODO: IDM Hack Check

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.RoomChangeItemsAck(id, skill, skill2, weapon1, weapon2, weapon3, unk), session)
	},
	handleAvatarChangeRequest: function(packet, session) {
		log.debug('CAvatarChangeReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var id = packet.readUInt64LE()
		var head = packet.readUInt32LE()
		var face = packet.readUInt32LE()
		var shirt = packet.readUInt32LE()
		var pants = packet.readUInt32LE()
		var gloves = packet.readUInt32LE()
		var shoes = packet.readUInt32LE()
		var special = packet.readUInt32LE()
        var skill = packet.readUInt32LE()
		var skill2 = packet.readUInt32LE()
		var weapon1 = packet.readUInt32LE()
		var weapon2 = packet.readUInt32LE()
		var weapon3 = packet.readUInt32LE()
		var unk = packet.readRemaining()
		//console.log(packet.readRemaining()) // unk

		//var unk = packet.readBuffer(4)
		//var gender = packet.readUInt8()
		//var unk2 = packet.readBuffer(5)

		//log.debug('ID: ' + id + ' SKILL: ' + skill + ' Skill2: ' + skill2 + ' Weapon1: ' + weapon1 + ' Weapon2: ' + weapon2 + ' Weapon3: ' + weapon3)

		// TODO: IDM Hack Check

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.AvatarChangeAck(id, head, face, shirt, pants, gloves, shoes, special, skill, skill2, weapon1, weapon2, weapon3, unk), session)
	},
	handleChangeRoomRequest: function(packet, session) {
		log.debug('CChangeRoomReq')

		//if(!session.player_id) {
		//	return
		//}

		//if(!session.channel_id) {
		//	return
		//}

		//if(!session.room_id) {
		//	return
		//}

		// Player changes his character?
	},
	handleRoomPlayerGameModeChangeRequest: function(packet, session) {
		log.debug('CRoomPlayerGameModeChangeReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		// TODO: Validate Game Mode
		session.gameMode = packet.readUInt8()

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ChangeTeamAck(session.player_id, session.team, session.gameMode))

		//room.BroadcastBriefing()
	},
	handleTutorialCompletedRequest: function(packet, session) {
		log.debug('CTutorialCompletedReq')

		if(!session.player_id) {
			return
		}

		if(session.room_id) {
			return
		}

		if(session.tutorial_completed) {
			return
		}

		//var unk = packet.readUInt32LE()

		db.Account.findByID(session.player_id, function(err, account) {
			if(err) {
				return session.write(Request.ResultAck(EServerResult.DBError))
			}

			// check if account exists
			if(!account) {
				return session.write(Request.ResultAck(EServerResult.DBError))
			}

			db.Account.findByID(session.player_id, function(err, account) {

				if(account.tutorial_completed) {
					return
				}

				account.pen += 5000
				account.tutorial_completed = 1

				account.save(function(err) {
					if(err) {
						return session.write(Request.ResultAck(EServerResult.DBError))
					}

					session.pen += 5000
					session.tutorial_completed = 1
				})
			})
		})
	},
	handleScoreSurvivalRequest: function(packet, session) {
		log.debug('CScoreSurvivalReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		console.log(packet)
	},
	handleQuickJoinRequest: function(packet, session) {
		log.debug('CQuickJoinReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(session.room_id) {
			return
		}

		if(!session.player_connection_type) {
			return session.write(Request.ResultAck(EServerResult.FailEnterRoom))
		}

		var mode = packet.readUInt8()

		var allowedModes = [
			EGameRule.Deathmatch,
			EGameRule.Touchdown
		]

		if(allowedModes.indexOf(mode) === -1) {
			log.warning('HAX - Unknown Mode ' + mode + '.')
			return session.write(this.ResultAck(EServerResult.GameServerError))
		}

		var room_id = RoomHandler.quickJoin(session, mode)
		if(room_id) {
			return RoomHandler.join(session, room_id, 0, EPlayerGameMode.Normal)
		}

		// nothing found
		session.write(this.ResultAck(EServerResult.QuickJoinFailed))
	},
	handleRoomMovePlayerRequest: function(packet, session) {
		log.debug('SCRoomMovePlayer')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		// check if the room is waiting
		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)
		if(room.state !== EGameRuleState.Waiting) {
			return
		}

		// check if the player is master
		if(session.player_id !== room.master_id) {
			return
		}

		var target_id = packet.readUInt64LE()
		var unk = packet.readUInt64LE() // ?
		var from_team = packet.readUInt8()
		var to_team = packet.readUInt8()

		// get the target player
		var target = getPlayerByID(target_id)

		// check if the target is in the room
		if(target.room_id !== session.room_id) {
			return
		}

		var numPlayers

		if(to_team === ETeam.Alpha) {
			numPlayers = RoomHandler.countInTeam(room, ETeam.Alpha, target.gameMode)
		} else if(to_team === ETeam.Beta) {
			numPlayers = RoomHandler.countInTeam(room, ETeam.Beta, target.gameMode)
		} else {
			return
		}

		var limit = session.gameMode == EPlayerGameMode.Normal ? room.player_limit / 2 : room.observers / 2
        if (numPlayers >= limit) {
			return // full
		}

		target.team = to_team

		session.write(Request.CRoomMovePlayer(target_id, unk, from_team, target.team))
		RoomHandler.broadcastBriefing(room)
	},
	handleRoomShuffleRequest: function(packet, session) {
		log.debug('CRoomShuffleReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		// check if the room is waiting
		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)
		if(room.state !== EGameRuleState.Waiting) {
			return
		}

		// check if the player is master
		if(session.player_id !== room.master_id) {
			return
		}

		//var numAlpha = RoomHandler.countInTeam(room, ETeam.Alpha)
        //var numBeta = RoomHandler.countInTeam(room, ETeam.Beta)

		// TODO: Random shuffle but check for team limit!
		for (var i = 0; i < room.players.length; ++i) {
			var player = room.players[i]
			player.team = Math.floor(Math.random() * (2 - 1 + 1)) + 1
		}

		RoomHandler.broadcastBriefing(room)

		session.write(Request.NoticeAck('Shuffle the team members. Reshuffle will be available after 3 secs.'))
		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.NoticeAck('Team Shuffle is done.'), session)
	},
	handleScoreSentryRequest: function(packet, session) {
		log.debug('CScoreSentryReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// check if room is not waiting or in half time
		if(room.state != EGameRuleState.Playing || room.timeState == EGameTimeState.HalfTime) {
		    return
		}

		// check if room is Survival
		if(room.mode !== EGameRule.Survival) {
			return
		}

		var score = packet.readUInt32LE()
		var point = packet.readUInt32LE()

		room.scoreAlpha++
		session.score.totalPoints++
		session.survival.killPoints++

		RoomHandler.broadcastBriefing(room)
		// TODO: Ack
		//RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ScoreKillAck(session.player_id, 0, 2, 0, session.player_id))
	},
	handleChangeRoomSettingsRequest: function(packet, session) {
		log.debug('CChangeRoomSettingsReq')

		if(!session.player_id) {
			return
		}

		if(!session.channel_id) {
			return
		}

		if(!session.room_id) {
			return
		}

		// check if the room is waiting
		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)
		if(room.state !== EGameRuleState.Waiting) {
			return
		}

		// check if the user is room master
		if(session.player_id !== room.master_id) {
			return
		}

		var name = packet.readStringNT(31)
		var password = packet.readStringNT(17)
		var passwordCRC = packet.readUInt32LE()
		var matchKey = packet.readBuffer(4)
		var time_limit = packet.readUInt8()
		var score_limit = packet.readUInt8()
		var unk = packet.readUInt32LE()
		var is_friendly = packet.readUInt8()
		var is_balanced = packet.readUInt8()
		var equip_limit = packet.readUInt8()
		var is_no_intrusion = packet.readUInt8()

		/*
		console.log('Name: ' + name)
		console.log('Password: ' + password)
		console.log('Password CRC: ' + passwordCRC)
		console.log('publicType: ' + ((matchKey[0] >> 1) & 1))
		console.log('joinAuth: ' + ((matchKey[0] >> 2) & 1))
		console.log('GM Room: ' + ((matchKey[0] >> 2) & 1))
		console.log('Mode: ' + (matchKey[0] >> 4))
		console.log('Map: ' + matchKey[1])
		console.log('Player Limit: ' + matchKey[2])
		console.log('Observers: ' + matchKey[3])
		console.log('time_limit: ' + (time_limit * (60 * 1000)))
		console.log('score_limit: ' + score_limit)
		console.log('UNK: ' + unk)
		console.log('is_friendly: ' + is_friendly)
		console.log('is_balanced: ' + is_balanced)
		console.log('equip_limit: ' + equip_limit)
		console.log('is_no_intrusion: ' + is_no_intrusion)
		*/

		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.ChangeRoomSettingsAck(name, password, matchKey, time_limit, score_limit, is_friendly, is_balanced, equip_limit, is_no_intrusion))

		setTimeout(function() {
			var packet = new Packet(0x95)
			/*
			packet.writeString(name, 31)
			packet.writeString(password, 17)
			*/
			packet.writeBuffer(matchKey)
			packet.writeUInt8(time_limit)
			packet.writeUInt8(score_limit)
			packet.writeUInt8(is_friendly)
			packet.writeUInt8(is_balanced)
			packet.writeUInt8(equip_limit)
			packet.writeUInt8(is_no_intrusion)
			//RoomHandler.broadcastToRoom(session.channel_id, session.room_id, packet.finalize())
		}, 5000) // Change Room after 5 Seconds
	},
	ChangeRoomSettingsAck: function(name, password, matchKey, time_limit, score_limit, is_friendly, is_balanced, equip_limit, is_no_intrusion) {
		log.debug('ChangeRoomSettingsAck')

		var packet = new Packet(EGamePacket.SChangeRoomSettingsAck)
		packet.writeString(name, 31)
		packet.writeString(password, 17)
		packet.writeBuffer(matchKey)
		packet.writeUInt8(time_limit)
		packet.writeUInt8(score_limit)
		packet.writeUInt8(is_friendly)
		packet.writeUInt8(is_balanced)
		packet.writeUInt8(equip_limit)
		packet.writeUInt8(is_no_intrusion)
		return packet.finalize()
	},
	isServerOverloaded: function() {
		return false
	},
	isPlayerLimitExceeded: function() {
		return players.length >= Cache.playerLimit
	},
	isIPBlacklisted: function(ip) {
		return false
	},
	sendAccountInfo: function(session) {
		async.series({
			license: function(callback) {
				Request.LicenseInfoAck(session, function(err, result) {
					callback(err, result)
				})
			},
			character: function(callback) {
				db.Character.findByAccountIDAndPopulateWeapons(session.player_id, function(err, character) {
					session.characters = character
					session.write(Request.CharSlotInfoAck(character.length, 3, session.active_char_slot), function(err, result) {
						for (var i = 0; i < character.length; ++i) {
							var char = character[i]
							session.write(Request.OpenCharInfoAck(char))
							session.write(Request.CharEquipInfoAck(char))
						}
						callback(err, result)
					})
				})
			},
			inventory: function(callback) {
				Request.InventoryAck(session, function(err, result) {
					callback(err, result)
				})
			},
			/*
			beginClanInfo: function(callback) {
				session.write(Request.BeginClanInfoAck(), function(err, result) {
					callback(null, null)
				})
			},
			*/
			result1: function(callback) {
				session.write(Request.ResultAck(EServerResult.InventorySuccess), function(err, result) {
					callback(err, result)
				})
			},
			beginAccountInfo: function(callback) {
				session.write(Request.BeginAccountInfoAck(session), function(err, result) {
					callback(err, result)
				})
			},
			result2: function(callback) {
				session.write(Request.ResultAck(EServerResult.LoginSuccess), function(err, result) {
					callback(err, result)
				})
			}
		}, function(err, result) {

		})
	},
	TouchdownHandler: function(session, id) {
		if(!session.room_id) {
			return
		}

		var player = getPlayerByID(id)
		if(!player) {
			return
		}

		// check if player is with the session in the same room
		if(session.room_id !== player.room_id || session.channel_id !== player.channel_id) {
			return
		}

		var room = RoomHandler.getRoomByIDAndChannelID(session.room_id, session.channel_id)

		// check if room is not waiting or in half time
		if(room.state != EGameRuleState.Playing || room.timeState == EGameTimeState.HalfTime) {
		    return
		}

		// check if the user is room master
		if(session.gm_level === 0 && session.player_id !== room.master_id) {
			return
		}

		// check if room is TD
		if(room.mode !== EGameRule.Touchdown) {
			return
		}

		// check if room is TDWaiting
		if(room.TDWaiting) {
			return
		}

		var ts
		var assist = null
		switch (player.team) {
            case ETeam.Alpha:
                room.lastAlphaTD = new Date().getTime()
                ts = new Date().getTime() - room.lastAlphaFumbi
                if (ts < 10000) { // 10 seconds timer for td assist?
					assist = getPlayerByID(room.lastAlphaFumbiID)
                }
            	break
            case ETeam.Beta:
                room.lastBetaTD = new Date().getTime()
                ts = new Date().getTime() - room.lastBetaFumbi
                if (ts < 10000) { // 10 seconds timer for td assist?
                    assist = getPlayerByID(room.lastBetaFumbiID)
                }
                break
        }

		// Found an assist?
		if(assist) {
			// Check if the assist(or) is still in the room
			if(assist.room_id !== player.room_id || assist.channel_id !== player.channel_id) {
				assist = null
			}
		}

		player.score.totalPoints += 10
		player.td.TDScore++

		room.TDWaiting = true
		var team
		if(player.team ===  ETeam.Alpha) {
			room.scoreAlpha++
			team = EPlayerEventMessage.TouchdownAlpha
		} else if(player.team ===  ETeam.Beta) {
			room.scoreBeta++
			team = EPlayerEventMessage.TouchdownBeta
		} else {
			return
		}

		// TODO: Really needed?
		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, this.CTouchdown(0))

		// touchdown packet
		if(!assist) {
			RoomHandler.broadcastToRoom(session.channel_id, session.room_id, this.ScoreTouchdownAck(id))
        } else {
        	assist.score.totalPoints += 5
        	assist.td.TDAssist++

			RoomHandler.broadcastToRoom(session.channel_id, session.room_id, this.ScoreTouchdownAssistAck(id, assist.player_id))
        }

		// touchdown event
		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, this.EventMessageAck(team, 0, 0, 0, ''))

		// touchdown counter
		RoomHandler.broadcastToRoom(session.channel_id, session.room_id, this.EventMessageAck(EPlayerEventMessage.NextRoundIn, 9000, 0, 0, ''))

		// TODO: Move to RoomHandler and only call when room is still alive...
		// wait 9 seconds after touchdown
		setTimeout(function() {
			room.TDWaiting = false
			if(room.timeState == EGameTimeState.HalfTime || room.state != EGameRuleState.Playing || room.beforeResult) {
				return
			}
			RoomHandler.broadcastToRoom(session.channel_id, session.room_id, Request.EventMessageAck(EPlayerEventMessage.ResetRound, 0, 0, 0, ''))
		}, 9000)
	},
	validateKillWeapon: function(murder, damageType, allowMindEnergy) {
		if(!allowMindEnergy && damageType === 15) {
			return false
		}

		var character = getCharacterBySlot(murder.characters, murder.active_char_slot)

		var weapon = Helper.getWeaponByDamageType(damageType)
		if(!weapon) {
			log.debug('HAX - Unknown Weapon Damage Type: ' + damageType)
			return false
		}

		var hasWeapon = false

		// Check if the player has that weapon...
		for (var i = 0; i < weapon.weapons.length; ++i) {
			var weap = weapon.weapons[i]
			if(character.weapon_1 && character.weapon_1.category === weap.category && character.weapon_1.sub_category === weap.subCategory && character.weapon_1.item_id === weap.itemID && character.weapon_1.product_id === weap.productID)  {
				hasWeapon = true
			}

			if(character.weapon_2 && character.weapon_2.category === weap.category && character.weapon_2.sub_category === weap.subCategory && character.weapon_2.item_id === weap.itemID && character.weapon_2.product_id === weap.productID)  {
				hasWeapon = true
			}

			if(character.weapon_3 && character.weapon_3.category === weap.category && character.weapon_3.sub_category === weap.subCategory && character.weapon_3.item_id === weap.itemID && character.weapon_3.product_id === weap.productID)  {
				hasWeapon = true
			}
		}

		return hasWeapon
	},
	LoginAck: function(id, error) {
		log.debug('LoginAck')

		var packet = new Packet(EGamePacket.SLoginAck)
		packet.writeUInt64LE(id)
		packet.writeUInt32LE(error)
		return packet.finalize()
	},
	ResultAck: function(result) {
		log.debug('ResultAck')

		var packet = new Packet(EGamePacket.SResultAck)
		packet.writeUInt32LE(result)
		return packet.finalize()
	},
	AdminActionAck: function(text) {
		log.debug('AdminActionAck')

		var packet = new Packet(EGamePacket.SAdminActionAck)
		packet.writeUInt8(1)
		packet.writeUInt16LE(text.length + 1)
		packet.writeString(text, text.length)
		return packet.finalize()
	},
	NoticeAck: function(text) {
		log.debug('NoticeAck')

		var packet = new Packet(EGamePacket.SNoticeAck)
		packet.writeUInt16LE(text.length + 1)
		packet.writeString(text, text.length)
		return packet.finalize()
	},
	EventMessageAck: function(event, id, unk1, unk2, str) {
		log.debug('EventMessageAck')

		var packet = new Packet(EGamePacket.SEventMessageAck)
		packet.writeUInt8(event)
		packet.writeUInt64LE(id)
		packet.writeUInt32LE(unk1)
        packet.writeUInt16LE(unk2)
        packet.writeUInt32LE(str.length)
        if (str.length > 0) {
        	packet.writeString(str, str.length)
        }
		return packet.finalize()
	},
	TimeSyncAck: function(time, ts) {
		//log.debug('TimeSyncAck')

		var packet = new Packet(EGamePacket.STimeSyncAck)
		packet.writeUInt32LE(time)
		packet.writeUInt32LE(ts)
		return packet.finalize()
	},
	InventoryAddItemAck: function(id, item, category, sub_category, product, effect, sell_price, purchase_time, expire_time, energy, time_left) {
		log.debug('InventoryAddItemAck')

		var packet = new Packet(EGamePacket.SInventoryAddItemAck)
		packet.writeUInt64LE(id)
		packet.writeUInt8(category)
		packet.writeUInt8(sub_category)
		packet.writeUInt16LE(item)
		packet.writeUInt8(product)
		packet.writeUInt32LE(effect)
		packet.writeUInt32LE(sell_price)
		packet.writeInt64LE(purchase_time)
		packet.writeInt64LE(expire_time)
		packet.writeInt32LE(energy)
		packet.writeInt32LE(time_left)
		return packet.finalize()
	},
	BuyItemAck: function(result, id, item_id, category, sub_category, product, effect) {
		log.debug('BuyItemAck')

		var packet = new Packet(EGamePacket.SBuyItemAck)
		packet.writeUInt8(result)
		if(result === EBuyItemResult.OK) {
			packet.writeUInt8(category)
			packet.writeUInt8(sub_category)
			packet.writeUInt16LE(item_id)
			packet.writeUInt8(product)
			packet.writeUInt32LE(effect)
			packet.writeUInt64LE(id)
		}
		return packet.finalize()
	},
	CashUpdateAck: function(pen, ap) {
		log.debug('CashUpdateAck')

		var packet = new Packet(EGamePacket.SCashUpdateAck)
		packet.writeUInt32LE(pen)
		packet.writeUInt32LE(ap)
		return packet.finalize()
	},
	LicenseInfoAck: function(session, callback) {
		log.debug('LicenseInfoAck')

		// No, we don't want to do Licesnses...
		packet = new Packet(EGamePacket.SLicenseInfoAck)
		packet.writeUInt8(100)
		for (var i = 0; i < 100; ++i) {
			packet.writeUInt8(i)
		}
		session.write(packet.finalize())
		callback(null, null)
		return

		// Real implementation
		db.License.findByAccountID(session.player_id, function(err, licenses) {
			if(err) {
				return callback(null, null)
			}

			var packet

			if(!licenses) {
				packet = new Packet(EGamePacket.SLicenseInfoAck)
				packet.writeUInt8(0)
				session.write(packet.finalize())
				return callback(null, null)
			}

			packet = new Packet(EGamePacket.SLicenseInfoAck)
			packet.writeUInt8(licenses.length)
			for (var i = 0; i < licenses.length; ++i) {
				var license = licenses[i]
				packet.writeUInt8(license.license_id)
			}
			session.write(packet.finalize())
			callback(null, null)
		})
	},
	CharSlotInfoAck: function(chars, slots, active) {
		log.debug('CharSlotInfoAck')

		var packet = new Packet(EGamePacket.SCharSlotInfoAck)
		packet.writeUInt8(chars)
		packet.writeUInt8(slots)
		packet.writeUInt8(active)
		return packet.finalize()
	},
	OpenCharInfoAck: function(character) {
		log.debug('OpenCharInfoAck')

		var packet = new Packet(EGamePacket.SOpenCharInfoAck)
		packet.writeUInt8(character.slot)
		packet.writeUInt8(1) // skill counter
		packet.writeUInt8(3) // weapon counter
		packet.writeUInt32LE(character.avatar)
		return packet.finalize()
	},
	CharEquipInfoAck: function(character) {
		log.debug('CharEquipInfoAck')

		var packet = new Packet(EGamePacket.SCharEquipInfoAck)
		packet.writeUInt8(character.slot)
		packet.writeUInt8(1) // skill counter
		packet.writeUInt8(3) // weapon counter

		packet.writeUInt8(EItem.Weapon_1)
		packet.writeUInt64LE(character.weapon_1 ? character.weapon_1._id : 0)

		packet.writeUInt8(EItem.Weapon_2)
		packet.writeUInt64LE(character.weapon_2 ? character.weapon_2._id : 0)

		packet.writeUInt8(EItem.Weapon_3)
		packet.writeUInt64LE(character.weapon_3 ? character.weapon_3._id : 0)

		packet.writeUInt8(EItem.Skill)
		packet.writeUInt64LE(character.skill)

		packet.writeUInt8(EItem.Hair)
		packet.writeUInt64LE(character.hair)

		packet.writeUInt8(EItem.Face)
		packet.writeUInt64LE(character.face)

		packet.writeUInt8(EItem.Shirt)
		packet.writeUInt64LE(character.shirt)

		packet.writeUInt8(EItem.Pants)
		packet.writeUInt64LE(character.pants)

		packet.writeUInt8(EItem.Gloves)
		packet.writeUInt64LE(character.gloves)

		packet.writeUInt8(EItem.Shoes)
		packet.writeUInt64LE(character.shoes)

		packet.writeUInt8(EItem.Special)
		packet.writeUInt64LE(character.special)
		return packet.finalize()
	},
	InventoryAck: function(session, callback) {
		log.debug('InventoryAck')

		db.Inventory.findByAccountID(session.player_id, function(err, result) {
			var packet = new Packet(EGamePacket.SInventoryAck)
			packet.writeUInt32LE(result.length)

			for (var i = 0; i < result.length; ++i) {
				var item = result[i]
				packet.writeUInt64LE(item._id)
				packet.writeUInt8(item.category)
				packet.writeUInt8(item.sub_category)
				packet.writeUInt16LE(item.item_id)
				packet.writeUInt8(item.product_id)
				packet.writeUInt32LE(item.effect_id)
				packet.writeUInt32LE(10000) // sell price
				packet.writeInt64LE(item.time)
				packet.writeInt64LE(item.expire_time)
				packet.writeInt32LE(item.energy)
				packet.writeInt32LE(-1) // time left
			}

			session.write(packet.finalize(), function(err, result) {
				callback(err, result)
			})
		})
	},
	BeginClanInfoAck: function() {
		log.debug('BeginClanInfoAck')

		var packet = new Packet(EGamePacket.SBeginClanInfoAck)
		// TODO: Unk... Or just not implemented? But 1 more Byte and the client crashes ;o
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		packet.writeUInt8(1)
		return packet.finalize()
	},
	BeginAccountInfoAck: function(session) {
		log.debug('BeginAccountInfoAck')

		// TODO: Fix that

		// DM KD Rate
		var DMKDRate = 0
		if (session.stats.dm.kills !== 0) {
			//DMKDRate = session.stats.dm.kills / (session.stats.dm.death + 1)
		}

		// TD Winrate
		var tdWinrate = 0
		if (session.stats.td.matches !== 0) {
            tdWinrate = (session.stats.td.won / session.stats.td.matches * 100)
		}

		var packet = new Packet(EGamePacket.SBeginAccountInfoAck)
		packet.writeUInt8((session.gm_level ? 1 : 0))
		packet.writeUInt8(session.level)
		packet.writeUInt32LE(session.exp)
		packet.writeUInt32LE(0) // points ?
		packet.writeUInt32LE((session.tutorial_completed ? 3 : 0))
		packet.writeString(session.player_name, 31)
		packet.writeUInt32LE(0) // unk

		// DM
		packet.writeUInt32LE(session.stats.dm.won)
		packet.writeUInt32LE(session.stats.dm.lost)
		packet.writeUInt32LE(DMKDRate)
		packet.writeUInt32LE(0) // unk
		packet.writeUInt32LE(0) // unk
		packet.writeUInt32LE(0) // unk
		packet.writeUInt32LE(0) // unk
		packet.writeUInt32LE(0) // unk
		packet.writeUInt32LE(0) // unk

		// TD
		packet.writeFloatLE(tdWinrate) // wins??
		packet.writeInt32LE(0) // loses?
		packet.writeUInt32LE(session.stats.td.TDs)
		packet.writeUInt32LE(20 * session.stats.td.matches)
		packet.writeUInt32LE(session.stats.td.TDAssists)
		packet.writeUInt32LE(session.stats.td.kills)
		packet.writeUInt32LE(session.stats.td.killAssists)
		packet.writeUInt32LE(session.stats.td.offense)
		packet.writeUInt32LE(session.stats.td.offenseAssists)
		packet.writeUInt32LE(session.stats.td.defense)
		packet.writeUInt32LE(session.stats.td.defenseAssists)
		packet.writeUInt32LE(session.stats.td.recovery)

		packet.writeUInt32LE(0) // Total / x / 2 ???
		packet.writeUInt32LE(0) // unk, nothing happens
		packet.writeUInt32LE(0) // super increase for total score??
		packet.writeUInt32LE(0) // total score goes to 0??
		packet.writeUInt32LE(0) // unk, nothing happens
		packet.writeUInt32LE(0) // unk, nothing happens
		return packet.finalize()
	},
	CreateCharacterAck: function(slot, avatar) {
		log.debug('CreateCharacterAck')

		var packet = new Packet(EGamePacket.SCreateCharacterAck)
		packet.writeUInt8(slot)
		packet.writeUInt32LE(avatar)
		packet.writeUInt8(1) // skill count
		packet.writeUInt8(3) // weapon count
		return packet.finalize()
	},
	SelectCharacterAck: function(slot) {
		log.debug('SelectCharacterAck')

		var packet = new Packet(EGamePacket.SSelectCharacterAck)
		packet.writeUInt8(slot)
		return packet.finalize()
	},
	DeleteCharacterAck: function(slot) {
		log.debug('DeleteCharacterAck')

		var packet = new Packet(EGamePacket.SDeleteCharacterAck)
		packet.writeUInt8(slot)
		return packet.finalize()
	},
	RefundItemAck: function(result, id) {
		log.debug('RefundItemAck')

		var packet = new Packet(EGamePacket.SRefundItemAck)
		packet.writeUInt8(result)
		packet.writeUInt64LE(id)
		return packet.finalize()
	},
	RepairItemAck: function(id) {
		log.debug('RepairItemAck')

		var packet = new Packet(EGamePacket.SRepairItemAck)
        packet.writeUInt8(0) // unk
        packet.writeUInt64LE(id)
        return packet.finalize()
	},
	RefreshInvalidateItemsAck: function(items) {
		log.debug('RefreshInvalidateItemsAck')

		var packet = new Packet(EGamePacket.SRefreshInvalidateItemsAck)
		packet.writeUInt8(items.length)
		for (var i = 0; i < items.length; ++i) {
			var item = items[i]
			packet.writeUInt64LE(item.id)
		}
		return packet.finalize()
	},
	RefreshInvalidateEQItemsAck: function(items) {
		log.debug('RefreshInvalidateEQItemsAck')

		var packet = new Packet(EGamePacket.SRefreshInvalidateEQItemsAck)
		packet.writeUInt8(items.length)
		for (var i = 0; i < items.length; ++i) {
			var item = items[i]
			packet.writeUInt64LE(item.id)
		}
		return packet.finalize()
	},
	ClearInvalidateItemsAck: function(items) {
		log.debug('ClearInvalidateItemsAck')

		var packet = new Packet(EGamePacket.SClearInvalidateItemsAck)
        packet.writeUInt8(items.length)
		for (var i = 0; i < items.length; ++i) {
			var item = items[i]
			packet.writeUInt64LE(item.id)
		}
		return packet.finalize()
	},
	UseItemAck: function(type, charSlot, eqSlot, id) {
		log.debug('UseItemAck')

		var packet = new Packet(EGamePacket.SUseItemAck)
		packet.writeUInt8(type)
		packet.writeUInt8(charSlot)
		packet.writeUInt8(eqSlot)
		packet.writeUInt64LE(id)
		return packet.finalize()
	},
	JoinTunnelAck: function(slot) {
		log.debug('JoinTunnelAck')

		var packet = new Packet(EGamePacket.SJoinTunnelAck)
		packet.writeUInt8(slot)
		return packet.finalize()
	},
	RefreshLicenseInfoAck: function(id) {
		log.debug('RefreshLicenseInfoAck')

		var packet = new Packet(EGamePacket.SRefreshLicenseInfoAck)
        packet.writeUInt8(id)
        packet.writeUInt32LE(0) // ?
        return packet.finalize()
	},
	RoomPlayerEnter: function(session) {
		log.debug('RoomPlayerEnter')

		var packet = new Packet(EGamePacket.SCRoomPlayerEnter)
		packet.writeUInt64LE(session.player_id)
		packet.writeUInt8(session.team)
		packet.writeUInt8(session.gameMode)
		packet.writeUInt32LE(session.exp)
		packet.writeString(session.player_name, 31)
		return packet.finalize()
	},
	RoomReadyAck: function(player_id, ready) {
		log.debug('RoomReadyAck')

		var packet = new Packet(EGamePacket.SRoomReadyAck)
		packet.writeUInt64LE(player_id)
		packet.writeUInt8(ready)
		return packet.finalize()
	},
	ScoreKillAck: function(murderID, murderAssistID, weaponID, victimID, victimAssistID) {
		log.debug('ScoreKillAck')

		var packet = new Packet(EGamePacket.SScoreKillAck)
		if(murderID instanceof Buffer) {
			packet.writeBuffer(murderID)
		} else {
			packet.writeUInt64LE(murderID)
		}
		packet.writeUInt64LE(murderAssistID)
		packet.writeUInt32LE(weaponID)
		if(victimID instanceof Buffer) {
			packet.writeBuffer(victimID)
		} else {
			packet.writeUInt64LE(victimID)
		}
		packet.writeUInt64LE(victimAssistID)
		//packet.writeUInt8(0) // unk
		return packet.finalize()
	},
	ScoreKillAssistAck: function(murderID, murderAssistID, assistID, assistAssistID, weaponID, victimID, victimAssistID) {
		log.debug('ScoreKillAssistAck')

		var packet = new Packet(EGamePacket.SScoreKillAssistAck)
		if(murderID instanceof Buffer) {
			packet.writeBuffer(murderID)
		} else {
			packet.writeUInt64LE(murderID)
		}
		packet.writeUInt64LE(murderAssistID)
		if(assistID instanceof Buffer) {
			packet.writeBuffer(assistID)
		} else {
			packet.writeUInt64LE(assistID)
		}
		packet.writeUInt64LE(assistAssistID)
		packet.writeUInt32LE(weaponID)
		if(victimID instanceof Buffer) {
			packet.writeBuffer(victimID)
		} else {
			packet.writeUInt64LE(victimID)
		}
		packet.writeUInt64LE(victimAssistID)
		//packet.writeUInt8(0) // For what?
		return packet.finalize()
	},
	ReboundFumbiAck: function(new_id, old_id) {
		log.debug('ReboundFumbiAck')

		var packet = new Packet(EGamePacket.SReboundFumbiAck)
		packet.writeUInt64LE(new_id)
		packet.writeUInt64LE(old_id)
		return packet.finalize()
	},
	ScoreSuicideAck: function(id, unk1, unk2) {
		log.debug('ScoreSuicideAck')

		var packet = new Packet(EGamePacket.SScoreSuicideAck)
		packet.writeUInt64LE(id)
		packet.writeUInt64LE(unk1)
		packet.writeUInt32LE(unk2)
		return packet.finalize()
	},
	ScoreOffenseAck: function(murderID, murderAssistID, weaponID, victimID, victimAssistID) {
		log.debug('ScoreOffenseAck')

		var packet = new Packet(EGamePacket.SScoreOffenseAck)
		if(murderID instanceof Buffer) {
			packet.writeBuffer(murderID)
		} else {
			packet.writeUInt64LE(murderID)
		}
		packet.writeUInt64LE(murderAssistID)
		packet.writeUInt32LE(weaponID)
		if(victimID instanceof Buffer) {
			packet.writeBuffer(victimID)
		} else {
			packet.writeUInt64LE(victimID)
		}
		packet.writeUInt64LE(victimAssistID)
		//packet.writeUInt8(0) // For what?
		return packet.finalize()
	},
	ScoreOffenseAssistAck: function(murderID, murderAssistID, assistID, assistAssistID, weaponID, victimID, victimAssistID) {
		log.debug('ScoreOffenseAssistAck')

		var packet = new Packet(EGamePacket.SScoreOffenseAssistAck)
		if(murderID instanceof Buffer) {
			packet.writeBuffer(murderID)
		} else {
			packet.writeUInt64LE(murderID)
		}
		packet.writeUInt64LE(murderAssistID)
		if(assistID instanceof Buffer) {
			packet.writeBuffer(assistID)
		} else {
			packet.writeUInt64LE(assistID)
		}
		packet.writeUInt64LE(assistAssistID)
		packet.writeUInt32LE(weaponID)
		if(victimID instanceof Buffer) {
			packet.writeBuffer(victimID)
		} else {
			packet.writeUInt64LE(victimID)
		}
		packet.writeUInt64LE(victimAssistID)
		//packet.writeUInt8(0) // For what?
		return packet.finalize()
	},
	ScoreDefenseAck: function(murderID, murderAssistID, weaponID, victimID, victimAssistID) {
		log.debug('ScoreDefenseAck')

		var packet = new Packet(EGamePacket.SScoreDefenseAck)
		packet.writeUInt32LE(0) // unk
		if(murderID instanceof Buffer) {
			packet.writeBuffer(murderID)
		} else {
			packet.writeUInt64LE(murderID)
		}
		packet.writeUInt64LE(murderAssistID)
		packet.writeUInt32LE(weaponID)
		if(victimID instanceof Buffer) {
			packet.writeBuffer(victimID)
		} else {
			packet.writeUInt64LE(victimID)
		}
		packet.writeUInt64LE(victimAssistID)
		//packet.writeUInt8(0) // For what?
		return packet.finalize()
	},
	ScoreDefenseAssistAck: function(murderID, murderAssistID, assistID, assistAssistID, weaponID, victimID, victimAssistID) {
		log.debug('ScoreDefenseAssistAck')

		var packet = new Packet(EGamePacket.SScoreDefenseAssistAck)
		if(murderID instanceof Buffer) {
			packet.writeBuffer(murderID)
		} else {
			packet.writeUInt64LE(murderID)
		}
		packet.writeUInt64LE(murderAssistID)
		if(assistID instanceof Buffer) {
			packet.writeBuffer(assistID)
		} else {
			packet.writeUInt64LE(assistID)
		}
		packet.writeUInt64LE(assistAssistID)
		packet.writeUInt32LE(weaponID)
		if(victimID instanceof Buffer) {
			packet.writeBuffer(victimID)
		} else {
			packet.writeUInt64LE(victimID)
		}
		packet.writeUInt64LE(victimAssistID)
		//packet.writeUInt8(0) // For what?
		return packet.finalize()
	},
	ScoreHealAssistAck: function(id, unk) {
		log.debug('ScoreHealAssistAck')

		var packet = new Packet(EGamePacket.SScoreHealAssistAck)
		packet.writeUInt64LE(id)
		packet.writeUInt64LE(unk)
		return packet.finalize()
	},
	CTouchdown: function(unk) {
		log.debug('SCTouchdown')

		var packet = new Packet(EGamePacket.SCTouchdown)
        packet.writeUInt8(unk) // unk | 0 - 3
		return packet.finalize()
	},
	ScoreTouchdownAck: function(id) {
		log.debug('ScoreTouchdownAck')

		var packet = new Packet(EGamePacket.SScoreTouchdownAck)
    	packet.writeUInt64LE(id)
		return packet.finalize()
	},
	ScoreTouchdownAssistAck: function(player_id, assist_id) {
		log.debug('ScoreTouchdownAssistAck')

		var packet = new Packet(EGamePacket.SScoreTouchdownAssistAck)
    	packet.writeUInt32LE(0) // unk
        packet.writeUInt64LE(player_id)
        packet.writeUInt64LE(assist_id)
		return packet.finalize()
	},
	/*
	RandomshopItemInfoAck: function() {
		log.debug ('RandomshopItemInfoAck')

		var packet = new Packet(EGamePacket.SRandomshopItemInfoAck)
		packet.writeUInt8(0)
		packet.writeUInt8(3) // category
		packet.writeUInt8(80) // effect
		packet.writeUInt32LE(1001) // item id
		packet.writeUInt32LE(66125826) // skin id?
		packet.writeUInt32LE(0)
		return packet.finalize()
	},
	RandomshopChanceInfoAck: function() {
		log.debug('RandomshopChanceInfoAck')

		var packet = new Packet(EGamePacket.SRandomshopChanceInfoAck)
		packet.writeUInt32LE(7000) // chance | Range 0 - 10000
		return packet.finalize()
	},
	*/
	LogoutAck: function() {
		log.debug('LogoutAck')

		var packet = new Packet(EGamePacket.SLogoutAck)
		return packet.finalize()
	},
	RoomChangeItemsAck: function(id, skill, skill2, weapon1, weapon2, weapon3, unk) {
		log.debug('RoomChangeItemsAck')

		var packet = new Packet(EGamePacket.SRoomChangeItemsAck)
		packet.writeUInt64LE(id)
		packet.writeUInt32LE(skill)
		packet.writeUInt32LE(skill2)
		packet.writeUInt32LE(weapon1)
		packet.writeUInt32LE(weapon2)
		packet.writeUInt32LE(weapon3)
		packet.writeBuffer(unk)
		return packet.finalize()
	},
	AvatarChangeAck: function(id, head, face, shirt, pants, gloves, shoes, special, skill, skill2, weapon1, weapon2, weapon3, unk) {
		log.debug('AvatarChangeAck')

		var packet = new Packet(EGamePacket.SAvatarChangeAck)
		packet.writeUInt64LE(id)
		packet.writeUInt32LE(head)
		packet.writeUInt32LE(face)
		packet.writeUInt32LE(shirt)
		packet.writeUInt32LE(pants)
		packet.writeUInt32LE(gloves)
		packet.writeUInt32LE(shoes)
		packet.writeUInt32LE(special)
        packet.writeUInt32LE(skill)
		packet.writeUInt32LE(skill2)
		packet.writeUInt32LE(weapon1)
		packet.writeUInt32LE(weapon2)
		packet.writeUInt32LE(weapon3)
		packet.writeBuffer(unk)
		return packet.finalize()
	},
	ChangeTeamAck: function(player_id, team , game_mode) {
		log.debug('ChangeTeamAck')

		var packet = new Packet(EGamePacket.SChangeTeamAck)
		packet.writeUInt64LE(player_id)
		packet.writeUInt8(team)
		packet.writeUInt8(game_mode)
		return packet.finalize()
	},
	CRoomMovePlayer: function(target_id, unk, from_team, to_team) {
		log.debug('CRoomMovePlayer')

		var packet = new Packet(EGamePacket.SCRoomMovePlayer)
		packet.writeUInt64LE(target_id)
		packet.writeUInt64LE(unk)
		packet.writeUInt8(from_team)
		packet.writeUInt8(to_team)
		return packet.finalize()
	},
	AdminShowWindowAck: function(allowed) {
		log.debug('AdminShowWindowAck')

		var packet = new Packet(EGamePacket.SAdminShowWindowAck)
		packet.writeUInt8(+!allowed)
		return packet.finalize()
	},
	ClanInfoAck: function() {
		// Experimental Ack. Not for production use.
		// TODO: Lot is unknown... Or buggy by client because it's never used?!
		log.debug('ClanInfoAck')

		var packet = new Packet(EGamePacket.SClanInfoAck)
		packet.writeStringNT('AngryHoden', 31)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeString('2014.12.18') // Date created
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeUInt8(0)
		packet.writeStringNT('Netrunner', 31) // master
		return packet.finalize()
	}
	/*
	MessageBoxAck: function(text) {
		log.debug('MessageBoxAck')

		var packet = new Packet(EGamePacket.SMessageBoxAck)
		packet.writeStringNT(text)
		return packet.finalize()
	}
	*/
}

// PLUGIN STUFF
process.on('RequestHandler.doKick', function(id, callback) {
	var player = getPlayerByID(id)
	if(!player) {
		return callback()
	}
	Request.close(player)
	callback()
})

process.on('RequestHandler.doRoomkick', function(id, callback) {
	var player = getPlayerByID(id)
	if(!player) {
		return callback()
	}
	if(!player.room_id) {
		return callback()
	}
	RoomHandler.leave(player, 4)
	callback()
})

process.on('RequestHandler.getPlayersAll', function(callback) {
	callback(players)
})

process.on('RequestHandler.getServerInfo', function(callback) {
	var result = {
		name: Cache.name,
		players: {
			online: players.length,
			limit: Cache.playerLimit
		}
	}
	callback(result)
})

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