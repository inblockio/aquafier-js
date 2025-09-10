import buildServer from "./../server"
import {test} from "tap"
import Logger from "../utils/Logger";

test('should work with fetch', async t => {
  const fastify = buildServer()

  t.after(() => fastify.close())

  const response = await fastify.inject({
    method: "GET",
    url: "/test/chain/0x4a777220e23Bb657125731a51266C25FD9116560/0x329abc3404a43b8624ec7abdc0575c1b3ecc10627fcacc54d8b581b03df9b1b0"
  })

  const jsonResult = await response.json()
    Logger.info("JSON Result: ", jsonResult)
})
