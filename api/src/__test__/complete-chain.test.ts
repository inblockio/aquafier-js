import buildServer from "./../server"
import { test } from "tap"
import { fetchCompleteRevisionChain } from '../utils/quick_utils';
import { prisma } from '../database/db';



test('should work with fetch', async (t) => {
  console.log("Tap tests work")
})

test('should work with fetch', async t => {
  // t.plan(3)

  const fastify = buildServer()

  t.after(() => fastify.close())

  await fastify.listen()

  // const response = await fetch(
  //   //   'http://localhost:' + fastify?.server?.address().port
  //   'http://localhost:3000'
  // )
  // 0x4a777220e23Bb657125731a51266C25FD9116560_0x329abc3404a43b8624ec7abdc0575c1b3ecc10627fcacc54d8b581b03df9b1b0
  const response = await fastify.inject({
    method: "GET",
    url: "/test/chain/0x4a777220e23Bb657125731a51266C25FD9116560/0x329abc3404a43b8624ec7abdc0575c1b3ecc10627fcacc54d8b581b03df9b1b0"
  })

  // t.equal(1,1)
  // t.assert.strictEqual(response.status, 200)
  // t.assert.strictEqual(
  //   response.headers.get('content-type'),
  //   'application/json; charset=utf-8'
  // )
  const jsonResult = await response.json()
  console.log("JSON Result: ", jsonResult)
  // t.assert.strictEqual(jsonResult.hello, 'world')
})
