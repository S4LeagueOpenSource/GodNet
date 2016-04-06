var Schema = require('mongoose').Schema

var Channel = new Schema({
	_id: { type: Number, min: 1, required: true },
	name: { type: String, default: '', required: true },
	min_level: { type: Number, min: 0, max: 100, default: 0, required: true },
	max_level: { type: Number, min: 0, max: 100, default: 0, required: true },
	max_players: { type: Number, min: 0, default: 0, required: true }
})

module.exports = Channel