var Schema = require('mongoose').Schema

var Server = new Schema({
	group: { type: Number, min: 0, required: true },
	type: { type: Number, min: 0, max: 4, required: true },
	online: { type: Number, min: 0, default: 0, required: true },
	limit: { type: Number, min: 1, required: true },
	ip: { type: String, required: true },
	port: { type: Number, min: 1, max: 65535, required: true },
	name: { type: String, required: true }
})

module.exports = Server