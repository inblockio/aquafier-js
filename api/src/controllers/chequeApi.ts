import Aquafier, {OrderRevisionInAquaTree, reorderAquaTreeRevisionsProperties} from "aqua-js-sdk";
import {FastifyInstance} from "fastify";
import {ChequeRegisterRequest} from "../models/request_models";
import {prisma} from "../database/db";
import {getHost, getPort} from "../utils/api_utils";
import {estimateStringFileSize} from "../utils/file_utils";
import {createAquaTreeFromRevisions} from "../utils/revisions_operations_utils";
import Logger from "../utils/Logger";

export default async function chequeApiController(fastify: FastifyInstance) {

  //Creates a new revision, 
  fastify.post('/withdraw', async (request, reply) => {


    const { amount, wallet_address, aqua_tree_revision_hash } = request.body as ChequeRegisterRequest;

    // fetch aqua tree

    let res = await prisma.latest.findFirst({
      where: {
        hash: aqua_tree_revision_hash
      }
    })

    if (res == null) {
      return reply.code(403).send({
        success: false,
        message: `aqua tree with latest hash of ${aqua_tree_revision_hash} not found`
      });
    }

    // Get the host from the request headers
    const host = request.headers.host || `${getHost()}:${getPort()}`;

    // Get the protocol (http or https)
    const protocol = request.protocol || 'https'

    // Construct the full URL
    const url = `${protocol}://${host}`;

    //fetch the aqua tree
    // Retrieve the tree starting from the latest hash
    let [anAquaTree, fileObject] = await createAquaTreeFromRevisions(aqua_tree_revision_hash, url);

    // Ensure the tree is properly ordered
    let orderedRevisionProperties = reorderAquaTreeRevisionsProperties(anAquaTree);
    let aquaTreeWithOrderdRevision = OrderRevisionInAquaTree(orderedRevisionProperties);

    // verify if aqua tree is valid
    let aquafier = new Aquafier();
    let validAquaTree = await aquafier.verifyAquaTree(aquaTreeWithOrderdRevision, fileObject)

    if (validAquaTree.isErr()) {
      return reply.code(403).send({
        success: false,
        message: `aqua tree with latest hash of ${aqua_tree_revision_hash} is not valid `
      });
    }

    // get amount and see if the cheque is depleted ie the amount withdrawn is more than the value of the cheque
    let allHash = Object.keys(aquaTreeWithOrderdRevision)
    let genesisRevision = aquaTreeWithOrderdRevision.revisions[allHash[0]]

      Logger.info(`Genesis revision ${JSON.stringify(genesisRevision, null, 4)}`)
    let chequeAmount = genesisRevision['form_amount']

    if (chequeAmount == undefined) {
      return reply.code(403).send({
        success: false,
        message: `Cheque amount not found`
      });
    }

    let amountWithdrawn = 0
    let revisionHashes = Object.keys(aquaTreeWithOrderdRevision.revisions);
    if (revisionHashes.length > 1) {

      for (let index = 0; index < revisionHashes.length; index++) {
        if (index > 1) {
          const element = revisionHashes[index];
          let revision = aquaTreeWithOrderdRevision.revisions[element]

          let amounWithdrawnItem = revision['form_amount']

          if (amounWithdrawnItem == undefined) {
            return reply.code(403).send({
              success: false,
              message: `Cheque withdrawn  amount not found in revision ${element} `
            });
          }

          amountWithdrawn += amounWithdrawnItem
        }
      }
    }


    if (amountWithdrawn >= chequeAmount) {
      return reply.code(403).send({
        success: false,
        message: `Cheque amount is exhausted : withdrawn ${amountWithdrawn}, cheque amount ${chequeAmount}  `
      });
    }

    let newWithdrawnAmount = amountWithdrawn + amount
    if (newWithdrawnAmount > chequeAmount) {
      return reply.code(403).send({
        success: false,
        message: `Cheque amount is exhausted : cannot withdraw ${amount}, cheque amount ${chequeAmount}   already withdrawl ${amountWithdrawn}`
      });
    }

    // cheque has sufficient amount register a new form revision in the aqua tree
    let aquaTreeWithFormRevision = await aquafier.createFormRevision({
      aquaTree: aquaTreeWithOrderdRevision,
      revision: ""
    }, {
      fileContent: {
        amount, wallet_address
      },
      fileName: "cheque_withdraw.json",
      path: "./",
      fileSize: estimateStringFileSize(JSON.stringify({ amount, wallet_address }))
    })

    if (aquaTreeWithFormRevision.isErr()) {
      return reply.code(500).send({
        success: false,
        message: `Unable to create new form revision`
      });
    }


      Logger.info(`Aqua tree with new form  revision ${JSON.stringify(aquaTreeWithFormRevision, null, 4)}`)


    let aquaTreeWithNewFormRevisionAndOrderdRevision = OrderRevisionInAquaTree(aquaTreeWithFormRevision.data.aquaTree!!);

    let allHashes = Object.keys(aquaTreeWithNewFormRevisionAndOrderdRevision.revisions)
    let lastHash = allHashes[allHashes.length - 1]

      Logger.info(`last hash is ${lastHash} in all hashes ${allHashes}`)

    return { message: 'created a new revision' };
  });

}