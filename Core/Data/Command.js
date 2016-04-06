var Schema = require('mongoose').Schema

var Command = new Schema({
	account_id: { type: Number, min: 0, required: true, ref: 'Account' },
	text: { type: String, required: true },
	time: { type: Number, min: 0 }
})

Command.pre('save', function(next) {
	this.time = parseInt((new Date().getTime() / 1000))
	next()
})

module.exports = Command