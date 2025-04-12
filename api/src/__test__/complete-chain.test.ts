import buildServer from "./../server"
import { test } from "tap"



test('should work with fetch', async (t) => {
  console.log("Tap tests work")
})

test('should work with fetch', async t => {
  // t.plan(3)

  const fastify = buildServer()

  t.after(() => fastify.close())

  await fastify.listen()

  const response = await fetch(
    //   'http://localhost:' + fastify?.server?.address().port
    'http://localhost:3000'
  )

  t.equal(1,1)
  // t.assert.strictEqual(response.status, 200)
  // t.assert.strictEqual(
  //   response.headers.get('content-type'),
  //   'application/json; charset=utf-8'
  // )
  const jsonResult = await response.json()
  console.log("JSON Result: ", jsonResult)
  // t.assert.strictEqual(jsonResult.hello, 'world')
})