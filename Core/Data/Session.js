var Schema = require('mongoose').Schema

var Session = new Schema({
	account_id: { type: Number, required: true, ref: 'Account' },
	remoteAddress: { type: String, required: true },
	localAddress: { type: String, required: true },
	createdAt: { type: Date }
})

Session.index({ createdAt: 1 }, { expires: 120 }) // 120 seconds -> 2 minutes

Session.pre('save', function(next) {
	if(this.isNew) {
		this._id = Math.floor(Math.random() * (2147483647 - 1 + 1)) + 1 // Random Session ID generation...
	}
	this.createdAt = Date.now()
	next()
})

module.exports = Session