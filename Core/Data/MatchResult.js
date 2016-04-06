var Schema = require('mongoose').Schema

var MatchResult = new Schema({
	channel_id: { type: Number, min: 1, required: true, ref: 'Channel' },
	room_id: { type: Number, min: 1, required: true },
	mode: { type: Number, min: 1, required: true },
	map: { type: Number, min: 0, required: true },
	winner: { type: Number, min: 0, max: 2, required: true },
	scoreAlpha: { type: Number, min: 0, required: true },
	scoreBeta: { type: Number, min: 0, required: true },
	playTime: { type: Number, min: 0, required: true },
	time: { type: Number, min: 0 }
})

MatchResult.pre('save', function(next) {
	this.time = parseInt((new Date().getTime() / 1000))
	next()
})

module.exports = MatchResult