process.title = 'DataImporter'

var async = require('../Core/node_modules/async')
var EServerType = require('../Core/Constants/EServerType')
var Logger = require('../Core/Utils/Logger')

var log = new Logger('Program')

log.info('Starting Database...')

global.db = require('../Core/Database/Handler')

// Account data
var accounts = [
	{ _id: 1, login: 'test', password: 'test', nickname: '4353dfgdfgdfgdfgfd345564', nickname_clean: '4353dfgdfgdfgdfgfd345564', exp: 63703100, pen: 1000000, ap: 1000000, combi_points: 3110, gm_level: 5, tutorial_completed: 1 }
]

// Channel data
var channels = [
	{ _id: 1, name: 'Speed -Rookie', min_level: 0, max_level: 5, max_players: 686 },
	{ _id: 2, name: 'Speed -Super Rookie', min_level: 6, max_level: 12, max_players: 686 },
	{ _id: 3, name: 'Speed -Semi Pro', min_level: 13, max_level: 20, max_players: 686 },
	{ _id: 4, name: 'Speed -Pro', min_level: 21, max_level: 50, max_players: 686 },
	{ _id: 5, name: 'Speed -Free', min_level: 0, max_level: 100, max_players: 686 },
	{ _id: 6, name: 'Normal -Rookie', min_level: 0, max_level: 5, max_players: 686 },
	{ _id: 7, name: 'Normal -Super Rookie', min_level: 6, max_level: 12, max_players: 686 },
	{ _id: 8, name: 'Normal -Semi Pro', min_level: 13, max_level: 20, max_players: 686 },
	{ _id: 9, name: 'Normal -Pro', min_level: 21, max_level: 50, max_players: 686 },
	{ _id: 10, name: 'Normal -Free', min_level: 0, max_level: 100, max_players: 686 },
	{ _id: 11, name: 'Speed -Free2', min_level: 0, max_level: 100, max_players: 686 }
]

// License data
var licenses = [
	{ account_id: 1, license_id: 1 },
	{ account_id: 1, license_id: 2 },
	{ account_id: 1, license_id: 3 },
	{ account_id: 1, license_id: 4 },
	{ account_id: 1, license_id: 5 },
	{ account_id: 1, license_id: 6 },
	{ account_id: 1, license_id: 7 },
	{ account_id: 1, license_id: 8 },
	{ account_id: 1, license_id: 11 },
	{ account_id: 1, license_id: 12 },
	{ account_id: 1, license_id: 13 },
	{ account_id: 1, license_id: 14 },
	{ account_id: 1, license_id: 15 },
	{ account_id: 1, license_id: 16 },
	{ account_id: 1, license_id: 17 },
	{ account_id: 1, license_id: 18 },
	{ account_id: 1, license_id: 19 },
	{ account_id: 1, license_id: 25 },
	{ account_id: 1, license_id: 26 },
	{ account_id: 1, license_id: 27 },
	{ account_id: 1, license_id: 28 },
	{ account_id: 1, license_id: 30 },
	{ account_id: 1, license_id: 31 }
]

// Map data
var maps = [
	{ _id: 0, name: 'Station-1', mode: 2, player_limit: 12 },
	{ _id: 1, name: 'Neden-1', mode: 1, player_limit: 12 },
	{ _id: 3, name: 'Neden-3', mode: 2, player_limit: 12 },
	{ _id: 4, name: 'Neden-2', mode: 1, player_limit: 12 },
	{ _id: 5, name: 'Station-2', mode: 2, player_limit: 12 },
	{ _id: 6, name: 'Highway', mode: 2, player_limit: 12 },
	{ _id: 7, name: 'Neden-3', mode: 1, player_limit: 12 },
	{ _id: 8, name: 'OldSchool', mode: 2, player_limit: 12 },
	{ _id: 9, name: 'Tunnel', mode: 2, player_limit: 12 },
	{ _id: 10, name: 'Highway', mode: 1, player_limit: 12 },
	{ _id: 11, name: 'Circle', mode: 1, player_limit: 12 },
	{ _id: 12, name: 'Square-1', mode: 2, player_limit: 12 },
	{ _id: 13, name: 'Square-2', mode: 1, player_limit: 12 },
	{ _id: 14, name: 'Galleon', mode: 2, player_limit: 16 },
	{ _id: 15, name: 'Blockbuster', mode: 1, player_limit: 12 },
	{ _id: 16, name: 'Colosseum', mode: 2, player_limit: 12 },
	{ _id: 17, name: 'Temple-M', mode: 2, player_limit: 12 },
	{ _id: 18, name: 'Temple-O', mode: 1, player_limit: 12 },
	{ _id: 19, name: 'Circle-2', mode: 1, player_limit: 12 },
	{ _id: 20, name: 'SteelCage', mode: 2, player_limit: 12 },
	{ _id: 21, name: 'SteelCage2', mode: 2, player_limit: 12 },
	{ _id: 22, name: 'Side-3', mode: 2, player_limit: 12 },
	{ _id: 24, name: 'Galleon', mode: 1, player_limit: 12 },
	{ _id: 25, name: 'Neoniac', mode: 1, player_limit: 12 },
	{ _id: 26, name: 'Office', mode: 1, player_limit: 12 },
	{ _id: 27, name: 'Holiday', mode: 1, player_limit: 12 },
	{ _id: 28, name: 'OldMoon', mode: 1, player_limit: 12 },
	{ _id: 29, name: 'Nightmare', mode: 1, player_limit: 12 },
	{ _id: 30, name: 'Square', mode: 1, player_limit: 12 },
	{ _id: 31, name: 'Connest-2', mode: 1, player_limit: 12 },
	{ _id: 32, name: 'Luna-2', mode: 1, player_limit: 12 },
	{ _id: 201, name: 'Station-1', mode: 4, player_limit: 1 },
	{ _id: 202, name: 'Neden-1', mode: 4, player_limit: 1 },
	{ _id: 203, name: 'Tunnel', mode: 4, player_limit: 1 }
]

// Server data
var servers = [
	{ _id: 0, group: 0, type: EServerType.Auth, limit: 1000, ip: '127.0.0.1', port: 28002, name: 'AuthServer' },
	{ _id: 1, group: 1, type: EServerType.Game, limit: 1000, ip: '127.0.0.1', port: 28008, name: 'GodNet' },
	{ _id: 2, group: 1, type: EServerType.Chat, limit: 1000, ip: '127.0.0.1', port: 28012, name: 'GodNetChat' },
	{ _id: 3, group: 1, type: EServerType.Relay, limit: 1000, ip: '127.0.0.1', port: 28013, name: 'GodNetRelay' },
	{ _id: 4, group: 1, type: EServerType.NAT, limit: 1000, ip: '127.0.0.1', port: 38915, name: 'GodNetNAT' }
]

async.series({
	sleep: function(callback) {
		log.info('Initialising the Schema...')
		setTimeout(callback, 1000) // Needed by MongoDB to initialize the Schema...
	},
	accounts: function(callback) {
		db.Account.saveMultiple(accounts, function(err) {
			if(err) {
				log.error('Error while importing ' + accounts.length + ' Accounts')
				log.error(err)
				return callback(null, null)
			}

			log.info(accounts.length + ' Accounts imported')
			callback(null, null)
		})
	},
	channels: function(callback) {
		db.Channel.saveMultiple(channels, function(err) {
			if(err) {
				log.error('Error while importing ' + channels.length + ' Channels')
				log.error(err)
				return callback(null, null)
			}

			log.info(channels.length + ' Channels imported')
			callback(null, null)
		})
	},
	licenses: function(callback) {
		db.License.saveMultiple(licenses, function(err) {
			if(err) {
				log.error('Error while importing ' + licenses.length + ' Licenses')
				log.error(err)
				return callback(null, null)
			}

			log.info(licenses.length + ' Licenses imported')
			callback(null, null)
		})
	},
	maps: function(callback) {
		db.Map.saveMultiple(maps, function(err) {
			if(err) {
				log.error('Error while importing ' + maps.length + ' Maps')
				log.error(err)
				return callback(null, null)
			}

			log.info(maps.length + ' Maps imported')
			callback(null, null)
		})
	},
	servers: function(callback) {
		db.Server.saveMultiple(servers, function(err) {
			if(err) {
				log.error('Error while importing ' + servers.length + ' Servers')
				log.error(err)
				return callback(null, null)
			}

			log.info(servers.length + ' Servers imported')
			callback(null, null)
		})
	}
}, function(err) {
	if(err) {
		log.error('An error occured...')
	}

	process.exit()
})