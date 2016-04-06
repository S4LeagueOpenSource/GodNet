var Schema = require('mongoose').Schema

var Login = new Schema({
	account_id: { type: Number, required: true, ref: 'Account' },
	server_id: { type: Number, default: 0, required: true, ref: 'Server' },
	time: { type: Number, min: 0 }
})

Login.pre('save', function(next) {
	this.time = parseInt((new Date().getTime() / 1000))
	next()
})

module.exports = Login