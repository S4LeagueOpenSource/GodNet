var colors = require('colors')
var fs = require('fs')

var debug = !!process.argv[2]
var server
var file
var logToFile

var Logger = function(server, logToFile) {
	this.server = server
	this.file = 'log.txt'
	this.logToFile = logToFile
}

Logger.prototype.debug = function(str, log) {
	if(!debug) {
		return
	}

	str = '[' + this.server + '] DEBUG - ' + str

	console.log((str).cyan)

	if(this.logToFile || log) {
		writeToFile(str, this.file)
	}
}

Logger.prototype.error = function(str, log) {
	str = '[' + this.server + '] ERROR - ' + str

	console.log((str).red)

	if(this.logToFile || log) {
		writeToFile(str, this.file)
	}
}

Logger.prototype.info = function(str, log) {
	str = '[' + this.server + '] INFO - ' + str

	console.log((str).green)

	if(this.logToFile || log) {
		writeToFile(str, this.file)
	}
}

Logger.prototype.warning = function(str, log) {
	str = '[' + this.server + '] WARNING - ' + str

	console.log((str).yellow)

	if(this.logToFile || log) {
		writeToFile(str, this.file)
	}
}

function writeToFile(str, file) {
	fs.appendFileSync('logs/' + file, str + '\r\n')
}

module.exports = Logger