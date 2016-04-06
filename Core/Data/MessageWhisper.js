var Schema = require('mongoose').Schema

var MessageWhisper = new Schema({
	account_id: { type: Number, min: 1, required: true, ref: 'Account' },
	receiver_account_id: { type: Number, min: 1, required: true, ref: 'Account' },
	text: { type: String, required: true },
	time: { type: Number, min: 0 }
})

MessageWhisper.pre('save', function(next) {
	this.time = parseInt((new Date().getTime() / 1000))
	next()
})

module.exports = MessageWhisper