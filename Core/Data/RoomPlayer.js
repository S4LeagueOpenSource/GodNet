var Schema = require('mongoose').Schema

var RoomPlayer = new Schema({
	channel_id: { type: Number, required: true, ref: 'Channel' },
	room_id: { type: Number, min: 1, required: true, ref: 'Room' },
	slot_id: { type: Number, min: 1, required: true },
	player_id: { type: Number, required: true, ref: 'Account' },
	time: { type: Number, min: 0 }
})

RoomPlayer.pre('save', function(next) {
	this.time = parseInt((new Date().getTime() / 1000))
	next()
})

RoomPlayer.index({ player_id: 1 }, { unique: true })
RoomPlayer.index({ channel_id: 1, room_id: 1, slot_id: 1 }, { unique: true })

module.exports = RoomPlayer