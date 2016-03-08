'use strict'
const Hapi = require('hapi')
const mongo = require('mongodb').MongoClient

// Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname
const uri = require('./config.js').uri

const server = new Hapi.Server()
server.connection({
  // required for Heroku
  port: process.env.PORT || 8080
})

server.register(require('inert'), (err) => {
  
  if (err) throw err

  server.route({
    method: 'GET',
    path: '/new/{url*}',
    handler: function(request, reply){
      let url = request.params.url
  
      if (!validUrl(url)) return reply({
        original_url: url,
        error: 'incorrect url format'
      })
      
      let host = request.headers.host
      processUrl(url, host, reply)
    }
  })
  
  server.route({
    method: 'GET',
    path: '/{num}',
    handler: function(request, reply){
      let short = request.params.num
      let host = request.headers.host
      processShort(short, host, reply)
    }
  })
  
  server.route({
    method: 'GET',
    path: '/',
    handler: function(request, reply){
      reply.file('./index.html')
    }
  })
})

server.start(() => console.log('Started'))

function processShort(short, host, reply){
  mongo.connect(uri, function(err, db){
    if (err) throw err
    var urls = db.collection('urls')
    urls.findOne({ short_url: +short }, function(err, result){
      if (err) throw err
      if (!result){
        return reply({error: "No short url found for given input"})
      }
      reply.redirect(result.original_url)
    })
  })
}

function validUrl(url) {
  // regex url formula: http://code.tutsplus.com/tutorials/8-regular-expressions-you-should-know--net-6149
  let re = /^(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
  return re.test(url)
}

function processUrl(url, host, cb){
  mongo.connect(uri, function(err, db){
    if (err) throw err
    var urls = db.collection('urls')
    
    urls.findOne({ original_url: url }, function(err, result){
      if (err) throw err
      if (result){
        return cb({original_url: result.original_url, short_url: host + '/' + result.short_url})
      }
      // find max short_url
      urls.find().sort({_id:-1}).limit(1).toArray(function(err, result){
        if (err) throw err
        let nextShort = result[0] ? +result[0].short_url + 1 : 1
        urls.insert({
          original_url: url,
          short_url: nextShort
        }, function(err, result){
          if (err) throw err
          let ops = result.ops[0]
          cb({original_url: ops.original_url, short_url: host + '/' + ops.short_url})
        })
      })
    })
  })
}
