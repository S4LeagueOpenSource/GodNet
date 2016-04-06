var Schema = require('mongoose').Schema

var MessageRoom = new Schema({
	account_id: { type: Number, min: 1, required: true, ref: 'Account' },
	channel_id: { type: Number, min: 1, required: true, ref: 'Channel' },
	room_id: { type: Number, min: 1, required: true, ref: 'Room' },
	type: { type: Number, min: 1, max: 2, required: true }, // 1 = All | 2 = Team
	text: { type: String, required: true },
	time: { type: Number, min: 0 }
})

MessageRoom.pre('save', function(next) {
	this.time = parseInt((new Date().getTime() / 1000))
	next()
})

module.exports = MessageRoom