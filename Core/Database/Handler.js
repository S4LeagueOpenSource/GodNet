var mongoose = require('mongoose')
var autoIncrement = require('mongoose-auto-increment')
var Account = require('../Data/Account')
var Channel = require('../Data/Channel')
var Character = require('../Data/Character')
var Command = require('../Data/Command')
var Deny = require('../Data/Deny')
var Friend = require('../Data/Friend')
var Inventory = require('../Data/Inventory')
var License = require('../Data/License')
var Login = require('../Data/Login')
var Logger = require('../Utils/Logger')
var Map = require('../Data/Map')
var MatchResult = require('../Data/MatchResult')
var MessageChannel = require('../Data/MessageChannel')
var MessageRoom = require('../Data/MessageRoom')
var MessageWhisper = require('../Data/MessageWhisper')
var Room = require('../Data/Room')
var RoomPlayer = require('../Data/RoomPlayer')
var Server = require('../Data/Server')
var Session = require('../Data/Session')

var log = new Logger('Database')

// Options for mongoose
var options = {
	server: {
		poolSize: 5,
		socketOptions: {
			keepAlive: 1
		}
	}
}

// Let mongoose connect to MongoDB
mongoose.connect('mongodb://127.0.0.1/godnet', options)

// initialise AutoIncrement
autoIncrement.initialize(mongoose)

// Add AutoIncrement to Schemas
Account.plugin(autoIncrement.plugin, { model: 'Account', field: '_id', startAt: 1 })
Channel.plugin(autoIncrement.plugin, { model: 'Channel', field: '_id', startAt: 1 })
Character.plugin(autoIncrement.plugin, { model: 'Character', field: '_id', startAt: 1 })
Command.plugin(autoIncrement.plugin, { model: 'Command', field: '_id', startAt: 1 })
Deny.plugin(autoIncrement.plugin, { model: 'Deny', field: '_id', startAt: 1 })
Friend.plugin(autoIncrement.plugin, { model: 'Friend', field: '_id', startAt: 1 })
Inventory.plugin(autoIncrement.plugin, { model: 'Inventory', field: '_id', startAt: 1 })
License.plugin(autoIncrement.plugin, { model: 'License', field: '_id', startAt: 1 })
Login.plugin(autoIncrement.plugin, { model: 'Login', field: '_id', startAt: 1 })
Map.plugin(autoIncrement.plugin, { model: 'Map', field: '_id', startAt: 0 })
MatchResult.plugin(autoIncrement.plugin, { model: 'MatchResult', field: '_id', startAt: 0 })
MessageChannel.plugin(autoIncrement.plugin, { model: 'MessageChannel', field: '_id', startAt: 1 })
MessageRoom.plugin(autoIncrement.plugin, { model: 'MessageRoom', field: '_id', startAt: 1 })
MessageWhisper.plugin(autoIncrement.plugin, { model: 'MessageWhisper', field: '_id', startAt: 1 })
Room.plugin(autoIncrement.plugin, { model: 'Room', field: '_id', startAt: 1 })
RoomPlayer.plugin(autoIncrement.plugin, { model: 'RoomPlayer', field: '_id', startAt: 1 })
Server.plugin(autoIncrement.plugin, { model: 'Server', field: '_id', startAt: 0 })
Session.plugin(autoIncrement.plugin, { model: 'Session', field: '_id', startAt: 1 })

// Add Schemas to Mongoose
var Account = mongoose.model('Account', Account)
var Channel = mongoose.model('Channel', Channel)
var Character = mongoose.model('Character', Character)
var Command = mongoose.model('Command', Command)
var Deny = mongoose.model('Deny', Deny)
var Friend = mongoose.model('Friend', Friend)
var Inventory = mongoose.model('Inventory', Inventory)
var License = mongoose.model('License', License)
var Login = mongoose.model('Login', Login)
var Map = mongoose.model('Map', Map)
var MatchResult = mongoose.model('MatchResult', MatchResult)
var MessageChannel = mongoose.model('MessageChannel', MessageChannel)
var MessageRoom = mongoose.model('MessageRoom', MessageRoom)
var MessageWhisper = mongoose.model('MessageWhisper', MessageWhisper)
var Room = mongoose.model('Room', Room)
var RoomPlayer = mongoose.model('RoomPlayer', RoomPlayer)
var Server = mongoose.model('Server', Server)
var Session = mongoose.model('Session', Session)

log.info('Connected to Database')

module.exports = {
	Account: {
		findByID: function(id, callback) {
			Account.findOne({ _id: id }, function (err, result) {
				callback(err, result)
			})
		},
		findByLogin: function(login, callback) {
			Account.findOne({ login: login }, function (err, result) {
				callback(err, result)
			})
		},
		findByNickname: function(nickname, callback) {
			Account.findOne({ nickname_clean: nickname.toLowerCase() }, function (err, result) {
				callback(err, result)
			})
		},
		save: function(account, callback) {
			account = new Account(account)
			account.save(function(err, result) {
				callback(err, result)
			})
		},
		saveMultiple: function(accounts, callback) {
			Account.create(accounts, function (err, result) {
				callback(err, result)
			})
		},
		saveBanned: function(id, banned, callback) {
			Account.update({ _id: id }, { banned: banned }, function(err) {
				if(callback) {
					callback(err)
				}
			})
		},
		updateAP: function(id, ap, callback) {
			Account.update({ _id: id }, { $inc: { ap: ap } }, function(err) {
				if(callback) {
					callback(err)
				}
			})
		},
		updateEXP: function(id, exp, callback) {
			Account.update({ _id: id }, { $inc: { exp: exp } }, function(err) {
				if(callback) {
					callback(err)
				}
			})
		},
		updatePEN: function(id, pen, callback) {
			Account.update({ _id: id }, { $inc: { pen: pen } }, function(err) {
				if(callback) {
					callback(err)
				}
			})
		},
		updateStats: function(id, stats, callback) {
			Account.update({ _id: id }, { stats: stats }, function(err) {
				if(callback) {
					callback(err)
				}
			})
		}
	},
	Channel: {
		findAll: function(callback) {
			Channel.find({}, function(err, result) {
				callback(err, result)
			})
		},
		findAllAndSortIDAsc: function(callback) {
			Channel.find({}).sort({ _id: 'asc' }).exec(function(err, result) {
				callback(err, result)
			})
		},
		save: function(channel) {
			channel = new Channel(channel)
			channel.save()
		},
		saveMultiple: function(channels, callback) {
			Channel.create(channels, function (err, result) {
				callback(err, result)
			})
		}
	},
	Character: {
		deleteByAccountIDAndSlot: function(id, slot, callback) {
			Character.findOneAndRemove({ account_id: id, slot: slot }, function (err) {
				callback(err)
			})
		},
		findByAccountID: function(id, callback) {
			Character.find({ account_id: id }, function (err, result) {
				callback(err, result)
			})
		},
		findByAccountIDAndPopulateWeapons: function(id, callback) {
			Character.find({ account_id: id }).populate('weapon_1 weapon_2 weapon_3').exec(function (err, result) {
				callback(err, result)
			})
		},
		findByAccountIDAndSlot: function(id, slot, callback) {
			Character.findOne({ account_id: id, slot: slot }, function (err, result) {
				callback(err, result)
			})
		},
		save: function(character, callback) {
			character = new Character(character)
			character.save(function(err, result) {
				callback(err, result)
			})
		}
	},
	Command: {
		save: function(command) {
			command = new Command(command)
			command.save()
		}
	},
	Deny: {
		deleteByAccountIDAndDenyID: function(account_id, deny_id, callback) {
			Deny.findOneAndRemove({ account_id: account_id, deny_id: deny_id }, function (err) {
				callback(err)
			})
		},
		findByAccountID: function(id, callback) {
			Deny.find({ account_id: id }, function (err, result) {
				callback(err, result)
			})
		},
		findByAccountIDAndPopulateDenyID: function(id, callback) {
			Deny.find({ account_id: id }).populate('deny_id').exec(function (err, result) {
				callback(err, result)
			})
		},
		save: function(deny, callback) {
			deny = new Deny(deny)
			deny.save(function(err, result) {
				callback(err, result)
			})
		}
	},
	Friend: {
		deleteByAccountIDAndFriendID: function(account_id, friend_id, callback) {
			Friend.findOneAndRemove({ account_id: account_id, friend_id: friend_id }, function (err) {
				callback(err)
			})
		},
		findByAccountID: function(id, callback) {
			Friend.find({ account_id: id }, function (err, result) {
				callback(err, result)
			})
		},
		findByAccountIDAndFriendID: function(account_id, friend_id, callback) {
			Friend.findOne({ account_id: account_id, friend_id: friend_id }, function (err, result) {
				callback(err, result)
			})
		},
		findByAccountIDAndPopulateFriendID: function(id, callback) {
			Friend.find({ account_id: id }).populate('friend_id').exec(function (err, result) {
				callback(err, result)
			})
		},
		save: function(friend, callback) {
			friend = new Friend(friend)
			friend.save(function(err, result) {
				callback(err, result)
			})
		},
		UpdateStatusByAccountIDAndFriendID: function(account_id, friend_id, status, callback) {
			Friend.update({ account_id: account_id, friend_id: friend_id }, { $set: { status: status }}, function(err) {
				callback(err)
			})
		}
	},
	Inventory: {
		findByIDAndAccountID: function(id, account_id, callback) {
			Inventory.findOne({ _id: id, account_id: account_id }, function (err, result) {
				callback(err, result)
			})
		},
		findByAccountID: function(id, callback) {
			Inventory.find({ account_id: id }, function (err, result) {
				callback(err, result)
			})
		},
		findInID: function(ids, callback) {
			Inventory.find({ }).where('_id').in(ids).exec(function (err, result) {
				callback(err, result)
			})
		},
		save: function(inventory, callback) {
			inventory = new Inventory(inventory)
			inventory.save(function(err, result) {
				callback(err, result)
			})
		}
	},
	License: {
		findByAccountID: function(id, callback) {
			License.find({ account_id: id }, function (err, result) {
				callback(err, result)
			})
		},
		findByAccountIDAndLicenseID: function(account_id, license_id, callback) {
			Inventory.findOne({ account_id: account_id, license_id: license_id }, function (err, result) {
				callback(err, result)
			})
		},
		save: function(license, callback) {
			license = new License(license)
			license.save(function(err, result) {
				callback(err, result)
			})
		},
		saveMultiple: function(maps, callback) {
			License.create(maps, function (err, result) {
				callback(err, result)
			})
		}
	},
	Login: {
		save: function(login) {
			login = new Login(login)
			login.save()
		}
	},
	Map: {
		findAll: function(callback) {
			Map.find({}, function (err, result) {
				callback(err, result)
			})
		},
		findAllAndSortIDAsc: function(callback) {
			Map.find({}).sort({ _id: 'asc' }).exec(function(err, result) {
				callback(err, result)
			})
		},
		save: function(map) {
			map = new Map(map)
			map.save()
		},
		saveMultiple: function(maps, callback) {
			Map.create(maps, function (err, result) {
				callback(err, result)
			})
		}
	},
	MatchResult: {
		save: function(matchResult) {
			matchResult = new MatchResult(matchResult)
			matchResult.save()
		}
	},
	MessageChannel: {
		save: function(messageChannel) {
			messageChannel = new MessageChannel(messageChannel)
			messageChannel.save()
		}
	},
	MessageRoom: {
		save: function(messageRoom) {
			messageRoom = new MessageRoom(messageRoom)
			messageRoom.save()
		}
	},
	MessageWhisper: {
		save: function(messageWhisper) {
			messageWhisper = new MessageWhisper(messageWhisper)
			messageWhisper.save()
		}
	},
	Room: {
		deleteAll: function(callback) {
			Room.remove({ }, function(err) {
				callback(err)
			})
		},
		deleteByChannelIDAndRoomID: function(channel_id, room_id, callback) {
			Room.findOneAndRemove({ channel_id: channel_id, room_id: room_id }, function (err) {
				callback(err)
			})
		},
		save: function(room, callback) {
			room = new Room(room)
			room.save(function(err, result) {
				callback(err, result)
			})
		},
		UpdateMasterIDByChannelIDAndRoomID: function(channel_id, room_id, master_id, callback) {
			Room.update({ channel_id: channel_id, room_id: room_id }, { $set: { master_id: master_id }}, function(err) {
				callback(err)
			})
		}
	},
	RoomPlayer: {
		deleteAll: function(callback) {
			RoomPlayer.remove({ }, function(err) {
				callback(err)
			})
		},
		deleteByChannelIDAndRoomIDAndPlayerID: function(channel_id, room_id, player_id, callback) {
			RoomPlayer.findOneAndRemove({ channel_id: channel_id, room_id: room_id, player_id: player_id }, function (err) {
				callback(err)
			})
		},
		save: function(roomPlayer, callback) {
			roomPlayer = new RoomPlayer(roomPlayer)
			roomPlayer.save(function(err, result) {
				callback(err, result)
			})
		}
	},
	Server: {
		findAllAndSortIDAsc: function(callback) {
			Server.find({}).sort({ _id: 'asc' }).exec(function(err, result) {
				callback(err, result)
			})
		},
		save: function(server) {
			server = new Server(server)
			server.save()
		},
		saveMultiple: function(servers, callback) {
			Server.create(servers, function (err, result) {
				callback(err, result)
			})
		},
		saveOnline: function(id, online, callback) {
			Server.update({ _id: id }, { online: online }, function(err) {
				if(callback) {
					callback(err)
				}
			})
		},
		updateOnline: function(id, online, callback) {
			Server.update({ _id: id }, { $inc: { online: online } }, function(err) {
				if(callback) {
					callback(err)
				}
			})
		}
	},
	Session: {
		findByAccountID: function(id, callback) {
			Session.findOne({ account_id: id }, null, {sort: {createdAt: -1 }}, function (err, result) {
				callback(err, result)
			})
		},
		findByID: function(id, callback) {
			Session.findOne({ _id: id }, function (err, result) {
				callback(err, result)
			})
		},
		save: function(session, callback) {
			session = new Session(session)
			session.save(function(err, result) {
				callback(err, result)
			})
		}
	}
}