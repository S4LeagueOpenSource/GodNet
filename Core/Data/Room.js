var Schema = require('mongoose').Schema

var Room = new Schema({
	tunnel_id: { type: Number, min: 1, required: true },
	channel_id: { type: Number, required: true, ref: 'Channel' },
	room_id: { type: Number, min: 1, required: true },
	master_id: { type: Number, required: true, ref: 'Account' },
	time: { type: Number, min: 0 }
})

Room.pre('save', function(next) {
	this.time = parseInt((new Date().getTime() / 1000))
	next()
})

Room.index({ tunnel_id: 1 }, { unique: true })
Room.index({ master_id: 1 }, { unique: true })
Room.index({ channel_id: 1, room_id: 1 }, { unique: true })

module.exports = Room