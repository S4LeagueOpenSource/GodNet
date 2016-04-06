var Schema = require('mongoose').Schema

var Character = new Schema({
	account_id: { type: Number, required: true, ref: 'Account' },
	slot: { type: Number, min: 0, max: 2, required: true },
	avatar: { type: Number, min: 0, default: 0, required: true },
	weapon_1: { type: Number, min: 0, default: 0, required: true, ref: 'Inventory' },
	weapon_2: { type: Number, min: 0, default: 0, required: true, ref: 'Inventory' },
	weapon_3: { type: Number, min: 0, default: 0, required: true, ref: 'Inventory' },
	skill: { type: Number, min: 0, default: 0, required: true, ref: 'Inventory' },
	hair: { type: Number, min: 0, default: 0, required: true, ref: 'Inventory' },
	face: { type: Number, min: 0, default: 0, required: true, ref: 'Inventory' },
	shirt: { type: Number, min: 0, default: 0, required: true, ref: 'Inventory' },
	pants: { type: Number, min: 0, default: 0, required: true, ref: 'Inventory' },
	gloves: { type: Number, min: 0, default: 0, required: true, ref: 'Inventory' },
	shoes: { type: Number, min: 0, default: 0, required: true, ref: 'Inventory' },
	special: { type: Number, min: 0, default: 0, required: true, ref: 'Inventory' }
})

Character.index({ account_id: 1, slot: 1 }, { unique: true })

module.exports = Character