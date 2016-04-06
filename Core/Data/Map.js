var Schema = require('mongoose').Schema

var Map = new Schema({
	name: { type: String, required: true },
	mode: { type: Number, min: 0, max: 4, required: true },
	player_limit: { type: Number, min: 0, max: 16, required: true }
})

Map.index({ _id: 1, mode: 1 }, { unique: true })

module.exports = Map