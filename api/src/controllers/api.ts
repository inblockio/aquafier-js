

import Aquafier, { AquaTree, FileObject, LogData, LogType, Revision } from "aquafier-js-sdk";
import { FastifyInstance } from "fastify";
import { VerifyRequestBody } from "../models/request_models";

export default async function indexController(fastify: FastifyInstance) {

    //Creates a new revision, validated against aqua-verifier-js-lib verifier.
    fastify.post('/trees', async (request, reply) => {

        return { message: 'creat a new revision' };
    });

    //validated against aqua-verifier-js-lib verifier.
    fastify.post('/verify', async (request, reply) => {

        let logsEnabled=false;
         // Check for a specific value
         if (request.headers.logs === 'true' || request.headers.logs === '1') {
            // Enable detailed logging
            logsEnabled = true;
        }
        const aquafier = new Aquafier();

        const body  = request.body as VerifyRequestBody;

        let result = await aquafier.verifyAquaTreeRevision(
          body.tree,
          body.revision,
          body.hash,
          body.fileObject, 
        );

        // console.log("Data " + JSON.stringify(result, null, 4))
        if (result!.isOk()) {
          result.data.logData.push({
            log: `\n`,
            logType: LogType.EMPTY
          });
          result.data.logData.push({
            log: "AquaTree verified successfully",
            logType: LogType.SUCCESS
          })

          return  reply
          .code(200) // Set HTTP status code
          .send(logsEnabled ? { message: 'Data verified successfully', data: result.data } : {});
         
        } else {
          result.data.push({
            log: `\n`,
            logType: LogType.EMPTY
          });
          result.data.push({
            log: "AquaTree verification failed",
            logType: LogType.FINAL_ERROR
          })

          return  reply
          .code(400) // Set HTTP status code
          .send(logsEnabled ? { message: 'Error verifying revision', data: result.data } : {});
           
        }
    });

    //Retrieves the branch from the specified hash back to the genesis hash (backward traversal only)
    fastify.get('/trees/:revisionHash/latest', async (request, reply) => {
        const { revisionHash } = request.params as { revisionHash: string };
        console.log(`Received revisionHash: ${revisionHash}`);
        return { message: 'Latest revision hash data', revisionHash: revisionHash };
    });


    //Retrieves details of a specific revision hash
    fastify.get('/trees/:revisionHash', async (request, reply) => {
        const { revisionHash } = request.params as { revisionHash: string };
        console.log(`Received revisionHash: ${revisionHash}`);
        return { message: 'Latest revision hash data', revisionHash: revisionHash };
    });


}