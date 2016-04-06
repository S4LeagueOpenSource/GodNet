var Schema = require('mongoose').Schema

var MessageChannel = new Schema({
	account_id: { type: Number, min: 1, required: true, ref: 'Account' },
	channel_id: { type: Number, min: 1, required: true, ref: 'Channel' },
	text: { type: String, required: true },
	time: { type: Number, min: 0 }
})

MessageChannel.pre('save', function(next) {
	this.time = parseInt((new Date().getTime() / 1000))
	next()
})

module.exports = MessageChannel