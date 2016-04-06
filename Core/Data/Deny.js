var Schema = require('mongoose').Schema

var Deny = new Schema({
	account_id: { type: Number, required: true, ref: 'Account' },
	deny_id: { type: Number, required: true, ref: 'Account' }
})

Deny.index({ account_id: 1, deny_id: 1 }, { unique: true })

module.exports = Deny