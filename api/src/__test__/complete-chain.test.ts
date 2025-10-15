import buildServer from "./../server"
import { test } from "tap"
import Logger from "../utils/logger";

test('should work with fetch', async t => {
  const fastify = buildServer()

  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: "GET",
    url: "/test/chain/0x4a777220e23Bb657125731a51266C25FD9116560/0x329abc3404a43b8624ec7abdc0575c1b3ecc10627fcacc54d8b581b03df9b1b0"
  })

  const responseCode = response.statusCode

  t.equal(responseCode, 404)

})

test('test domain claim verification (sequential)', async t => {
  const fastify = buildServer()
  t.after(() => fastify.close())

  // First request
  const response1 = fastify.inject({
    method: "POST",
    url: "/verify/dns_claim",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      domain: "inblock.io",
      wallet: "0x254B0D7b63342Fcb8955DB82e95C21d72EFdB6f9"
    })
  })

  // t.equal(response1.statusCode, 200)

  // Second request (runs after the first)
  const response2 = fastify.inject({
    method: "POST",
    url: "/verify/dns_claim",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      domain: "inblock.io",
      wallet: "0x254B0D7b63342Fcb8955DB82e95C21d72EFdB6f7"
    })
  })

  let results = await Promise.all([response1, response2])

  t.equal(results[0].statusCode, 200)
  t.equal(results[1].statusCode, 200)
})
