var int53 = require('int53')
var SmartBuffer = require('smart-buffer')
var S4Crypt = require('../Cryptography/S4Crypt')

var data

var Packet = function(packet) {
	if (packet instanceof Buffer) {
		this.data = new SmartBuffer(packet)
	} else {
		this.data = new SmartBuffer()
		this.data.writeUInt8(0xF0) // Identifier
		this.data.writeUInt8(packet)
	}
}

Packet.prototype.finalize = function() {
	this.data.writeUInt16LE(this.data.length + 2, 0)
	return this.data.toBuffer()
}

Packet.prototype.decrypt = function() {
	var data = this.data.readBuffer(this.data.remaining())
	var decrypted = S4Crypt.decrypt(data)
	this.data = new SmartBuffer(decrypted)
}

Packet.prototype.encrypt = function() {
	var encrypted = S4Crypt.encrypt(this.data.toBuffer(), 2)
	this.data.writeBuffer(encrypted)
}

Packet.prototype.readInt8 = function() {
	if(this.data._readOffset + 1 > this.data.length) {
		return 0
	}

	return this.data.readInt8()
}

Packet.prototype.readUInt8 = function() {
	if(this.data._readOffset + 1 > this.data.length) {
		return 0
	}

	return this.data.readUInt8()
}

Packet.prototype.readInt16LE = function() {
	if(this.data._readOffset + 2 > this.data.length) {
		return 0
	}

	return this.data.readInt16LE()
}

Packet.prototype.readUInt16LE = function() {
	if(this.data._readOffset + 2 > this.data.length) {
		return 0
	}

	return this.data.readUInt16LE()
}

Packet.prototype.readInt32LE = function() {
	if(this.data._readOffset + 4 > this.data.length) {
		return 0
	}

	return this.data.readInt32LE()
}

Packet.prototype.readUInt32LE = function() {
	if(this.data._readOffset + 4 > this.data.length) {
		return 0
	}

	return this.data.readUInt32LE()
}

Packet.prototype.readFloatLE = function() {
	if(this.data._readOffset + 4 > this.data.length) {
		return 0
	}

	return this.data.readFloatLE()
}

Packet.prototype.readInt64LE = function() {
	if(this.data._readOffset + 8 > this.data.length) {
		return 0
	}

	return int53.readInt64LE(this.data)
}

Packet.prototype.readUInt64LE = function() {
	if(this.data._readOffset + 8 > this.data.length) {
		return 0
	}

	return int53.readUInt64LE(this.data)
}

Packet.prototype.readString = function(length) {
	return this.data.readString(length)
}

Packet.prototype.readStringNT = function(encoding, encoding2) {
	if(typeof encoding === 'number') {
		var previous_length = this.data._readOffset

		var data = this.data.readStringNT(encoding2)

		var current_length = this.data._readOffset

		var amount = encoding - (current_length - previous_length)

		if(amount != 0) {
			this.data.skip(amount)
		}

		return data
	}

	return this.data.readStringNT(encoding)
}

Packet.prototype.readBuffer = function(length) {
	return this.data.readBuffer(length)
}

Packet.prototype.readRemaining = function() {
	return this.data.readBuffer(this.data.remaining())
}

Packet.prototype.writeIpAddress = function(ip) {
	ip = ip.split('.')
	for (var i = 0; i < ip.length; i++) {
		this.data.writeUInt8(ip[i])
	}
}

Packet.prototype.writeInt8 = function(int) {
	this.data.writeInt8(int)
}

Packet.prototype.writeUInt8 = function(uint) {
	this.data.writeUInt8(uint)
}

Packet.prototype.writeInt16LE = function(int) {
	this.data.writeInt16LE(int)
}

Packet.prototype.writeUInt16LE = function(uint) {
	this.data.writeUInt16LE(uint)
}

Packet.prototype.writeInt32LE = function(int) {
	this.data.writeInt32LE(int)
}

Packet.prototype.writeUInt32LE = function(uint) {
	this.data.writeUInt32LE(uint)
}

Packet.prototype.writeFloatLE = function(float) {
	this.data.writeFloatLE(float)
}

Packet.prototype.writeInt64LE = function(int) {
	var fakeBuffer = new Buffer(8)
	int53.writeInt64LE(int, fakeBuffer)
	this.data.writeBuffer(fakeBuffer)
}

Packet.prototype.writeUInt64LE = function(uint) {
	var fakeBuffer = new Buffer(8)
	int53.writeUInt64LE(uint, fakeBuffer)
	this.data.writeBuffer(fakeBuffer)
}

Packet.prototype.writeString = function(str) {
	this.data.writeString(str)
}

Packet.prototype.writeString = function(str, length) {
	this.data.writeString(str)
	length = length - str.length
	for(var i = 1; i <= length; i++) {
		this.data.writeUInt8(0)
	}
}

Packet.prototype.writeStringNT = function(str) {
	this.data.writeStringNT(str)
}

Packet.prototype.writeBuffer = function(buffer) {
	this.data.writeBuffer(buffer)
}

Packet.prototype.rewind = function(value) {
	if(this.data._readOffset - value < 0) {
		return
	}

	this.data.rewind(value)
}

Packet.prototype.skip = function(value) {
	if(this.data._readOffset + value > this.data.length) {
		return
	}

	this.data.skip(value)
}


module.exports = Packet