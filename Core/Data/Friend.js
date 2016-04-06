var Schema = require('mongoose').Schema

var Friend = new Schema({
	account_id: { type: Number, required: true, ref: 'Account' },
	friend_id: { type: Number, required: true, ref: 'Account' },
	status: { type: Number, required: true }
})

Friend.index({ account_id: 1, friend_id: 1 }, { unique: true })

module.exports = Friend