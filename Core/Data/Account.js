var Schema = require('mongoose').Schema

var Account = new Schema({
	login: { type: String, min: 4, max: 16, trim: true, required: true },
	password: { type: String, min: 4, max: 16, required: true },
	nickname_clean: { type: String, lowercase: true, trim: true, required: true },
	nickname: { type: String, trim: true, required: true },
	exp: { type: Number, min: 0, default: 0, required: true },
	pen: { type: Number, min: 0, default: 0, required: true },
	ap: { type: Number, min: 0, default: 0, required: true },
	combi_points: { type: Number, min: 0, default: 0, required: true },
	stats: {
		matches: { type: Number, min: 0, default: 0 },
		won: { type: Number, min: 0, default: 0 },
		lost: { type: Number, min: 0, default: 0 },
		dm: {
			matches: { type: Number, min: 0, default: 0 },
			won: { type: Number, min: 0, default: 0 },
			lost: { type: Number, min: 0, default: 0 },
			kills: { type: Number, min: 0, default: 0 },
			killAssists: { type: Number, min: 0, default: 0 },
			recovery: { type: Number, min: 0, default: 0 }, // heal
			deaths: { type: Number, min: 0, default: 0 }
		},
		td: {
			matches: { type: Number, min: 0, default: 0 },
			won: { type: Number, min: 0, default: 0 },
			lost: { type: Number, min: 0, default: 0 },
			TDs: { type: Number, min: 0, default: 0 },
			TDAssists: { type: Number, min: 0, default: 0 },
			kills: { type: Number, min: 0, default: 0 },
			killAssists: { type: Number, min: 0, default: 0 },
			offense: { type: Number, min: 0, default: 0 },
			offenseAssists: { type: Number, min: 0, default: 0 },
			defense: { type: Number, min: 0, default: 0 },
			defenseAssists: { type: Number, min: 0, default: 0 },
			recovery: { type: Number, min: 0, default: 0 }, // heal
			deaths: { type: Number, min: 0, default: 0 },
			fumbi: { type: Number, min: 0, default: 0 }
		}
	},
	gm_level: { type: Number, min: 0, max: 5, default: 0, required: true },
	active_char_slot: { type: Number, min: 0, max: 2, default: 0, required: true },
	tutorial_completed: { type: Number, min: 0, max: 1, default: 0, required: true },
	nickname_set: { type: Number, min: 0, max: 1, default: 0, required: true },
	banned: { type: Number, min: -1, default: 0, required: true }
})

Account.index({ login: 1 }, { unique: true })
Account.index({ nickname_clean: 1 }, { unique: true })
Account.index({ nickname: 1 }, { unique: true })

module.exports = Account