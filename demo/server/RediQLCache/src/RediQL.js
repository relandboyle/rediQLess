const { parse } = require('graphql/language/parser')
const { visit, BREAK } = require('graphql/language/visitor')
const { graphql } = require('graphql')

const axios = require('axios')
const { request, gql } = require('graphql-request')
const redis = require('redis')
const REDIS_PORT = process.env.PORT || 6379
const redisClient = redis.createClient(REDIS_PORT)
const ExpCache = require('./ExperimentalCache')
const { rediResponse } = require('./ExperimentalCache')
// const redisClient = redis.createClient(REDIS_PORT)

// redisClient.on("error", (err) => {
//   console.log(err)
// })

// build our class component for the RediQLCache
// create a controller method
// reads query string from request obj --> gql query is parsed
// constructs a response from the cache --> cache is filled
// reformulates a query for any data not in cache --> cache gets overwritten in instance of novel data
// passes reformulated query to graphql library to resolve -->
// joins cached and uncached responses
// decomposes and caches the joined query
// attaches the joined response to the response object before passing control to the next middleware

// LOOK UP GRAPHQL METHODS AND SEE HOW THEY WORK
// READ ABOUT AST

// const rediQL = (redisClient, schema) => async (req,res,next) => {

//     // check redisClient for data
//     // searches redis cache
//     // if if finds it, it returns on the res

//     //if it doesn't find data
//     //make the gql request

// }

class RediQLCache {
  // establish our props
  constructor() {
    // bind our parser function to the constructor function
    this.parser = this.parser.bind(this)
    // set up a boilerplate query to send to spaceX API
    this.QLQuery = ` 
        { 
          launches {
            flight_number 
            mission_name
            launch_success 
            launch_date_utc  
            rocket {
              rocket_id 
              rocket_name
            }
          }
        }
        `   
    this.request = request
    this.query = this.query.bind(this)
    this.redisClient = redisClient
    this.cache = this.cache.bind(this)
    //this.response will return value from the cache, otherwise it will be assigned the response from graphql, than reassigned to this.cache()
    this.response 
    this.clearCache = this.clearCache.bind(this)
    this.rediResponse = false
  }
  cache() {
    /*
        Sends a get request to the redis cache, if the first argument exists as a key, 
        it will return that key's data. If not, it will return false.
        */
    this.redisClient.get(this.QLQuery, (err, data) => {
      if (err) throw err
      if (data !== null) { 
        console.log('Query already exists in the cache!')
        this.response = data
        return data
      } else {
        console.log(
          'Could not retrieve novel data, or you sent an invalid query.'
        )
        return null
      }
    })
  }
  //parser will be called with an argument of false if we are checking if a response can be formed from the cache
  //if we are caching a new response than parser will be called with true
  async parser(cacheResponse = true) {
    // parser will send parsed response or query to expCache for deconstruction/reconstruction for caching and query reformation.
    const parsedQuery = parse(this.QLQuery)
    let parsedResponse = this.response
    if (typeof parsedResponse == 'string')
      parsedResponse = JSON.parse(this.response)
    const expCache = new ExpCache(parsedQuery, this.redisClient, parsedResponse)
    await expCache.createQuery()
    if(cacheResponse) await expCache.cacheResponse()
    this.rediResponse = expCache.rediResponse
    console.log('expCache.rediResponse', expCache.rediResponse)
    if(expCache.rediResponse) {
      this.response = expCache.newResponse
    }
    
    // expCache.returnQuery()
    // return parsedQuery.definitions[0].selectionSet
  }

  async query(req, res, next) {
    await this.parser(false)
    if (this.rediResponse) {
      // THIS.PARSER USES PARSER METHOD ON LINE 86
      // this.parser()
      console.log('found cached')
      res.locals.query = this.response
      console.log('this.response')
      
     for(let i = 1; i < 3; i++) {
       
       console.log(this.response['launches'][i])
     }
      return next()
    } else {
      // Response data is referring to the middleware - this is the request to GQL
      
      let responseData
      console.log('rediResponse', rediResponse)
      if (this.rediResponse) responseData = this.response
      else {
        responseData = await this.request(
          'http://localhost:1500/graphql',  
          this.QLQuery
        )
      }
      console.log('Novel query has been made!')
      // console.log('Here is your novel response data ', responseData)
      // this.redisClient.setex(this.QLQuery, 3600, JSON.stringify(responseData))
      res.locals.query = responseData
      this.response = responseData 
      // THIS.PARSER USES PARSER METHOD
      if(!this.rediResponse) await this.parser()
      next()
    } 
  }

  clearCache(req, res, next) {
    this.redisClient.flushall()
    next()
  }
}

module.exports = RediQLCache
