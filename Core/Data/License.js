var Schema = require('mongoose').Schema

var License = new Schema({
	account_id: { type: Number, required: true, ref: 'Account' },
	license_id: { type: Number, min: 0, required: true },
	time: { type: Number, min: 0 }
})

License.pre('save', function(next) {
	this.time = parseInt((new Date().getTime() / 1000))
	next()
})

License.index({ account_id: 1, license_id: 1 }, { unique: true })

module.exports = License