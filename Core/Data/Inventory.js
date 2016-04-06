var Schema = require('mongoose').Schema

var Inventory = new Schema({
	account_id: { type: Number, required: true, ref: 'Account' },
	category: { type: Number, min: 0, required: true },
	sub_category: { type: Number, min: 0, required: true },
	item_id: { type: Number, min: 0, required: true },
	product_id: { type: Number, min: 0, required: true },
	effect_id: { type: Number, min: 0, required: true },
	expire_time: { type: Number, min: -1, required: true },
	time_used: { type: Number, min: 0, required: true },
	energy: { type: Number, min: 0, required: true },
	time: { type: Number, min: 0 }
})

Inventory.pre('save', function(next) {
	this.time = parseInt((new Date().getTime() / 1000))
	next()
})

module.exports = Inventory