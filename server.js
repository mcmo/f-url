'use strict'
const Hapi = require('hapi')

const server = new Hapi.Server()
server.connection({
  // required for Heroku
  port: process.env.PORT || 8080
})

server.route({
  method: 'GET',
  path: '/',
  handler: function(request, reply){
    reply('hapi happy')
  }
})

server.start(() => console.log('Started'))