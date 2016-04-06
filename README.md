GodNet
=============

GodNet is a FagNet S4 League Emulator implementation purely written in NodeJS.


### What it's useful for:

I created GodNet because FagNet and all others sucked. Their codebase were either written in a slow language or bad coding style. So I created GodNet in the fastest language for networking: NodeJS. It is incredibly fast! Written from scratch. It is not production ready yet.

Key Features:
* All Servers and a client for fast testing
* Event Driven Architecture.
* No bottlenecks (eg. slow language, slow RDBMS, [...])
* Solid Base - Easy extendable to implement the whole logic
* Easy Packet Handling
* Easy scalable

### TODO
* Modularisation
* Completion of the whole Project. It was only a little playground because I was bored and I wanted to learn how to work with networks. ;o

## Installing:

You need obviously NodeJS and NPM installed on your machine.
Also you need MongoDB to be installed and running.

Go in the Core directory and execute the following command:
`npm install`
Or use install.bat if you are on Windows.

## Using GodNet

You have the following modules available:
* Authentication Server
* Game Server
* Chat Server
* Relay Server
* NAT Server
* Client

You need all 4 Servers if you want to start up the S4Client. It was developed with a S4 Client Patch 9.

Just go in the directory and execute the following command:
`node Init.js`
Or use start.bat if you are on Windows.

## License

This work is licensed under the [WTFPL license](http://en.wikipedia.org/wiki/WTFPL).