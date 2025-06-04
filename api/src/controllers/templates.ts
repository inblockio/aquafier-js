import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../database/db';
import { AquaFormRequest, AquaFormFieldRequest, SettingsRequest, UserAttestationAddressesRequest } from '../models/request_models';
import { fetchEnsName, saveTemplateFileData } from '../utils/api_utils';
import { authenticate, AuthenticatedRequest } from '../middleware/auth_middleware';
import { AquaTemplateFields, AquaTemplate, UserAttestationAddresses } from '@prisma/client';
import Aquafier, { AquaTree, FileObject } from 'aqua-js-sdk';
import { deleteAquaTreeFromSystem, saveAquaTree } from '../utils/revisions_utils';

export default async function templatesController(fastify: FastifyInstance) {

    fastify.get<{
        Params: {
            templateId?: string;
        }
    }>('/templates/:templateId?', { preHandler: authenticate }, async (request: FastifyRequest & AuthenticatedRequest, reply) => {

        const { templateId } = request.params as { templateId?: string };
        let data: any = null;

        if (templateId) {
            // Get a specific template
            const template = await prisma.aquaTemplate.findFirst({
                where: {
                    id: {
                        equals: templateId,
                        mode: 'insensitive'
                    }
                }
            });

            if (template) {

                if (!template.public && request.user?.address !== template.owner) {
                    return reply.code(403).send({ success: false, message: "Unauthorized" });
                }

                // Get fields for this template
                const fields = await prisma.aquaTemplateFields.findMany({
                    where: {
                        aqua_form_id: {
                            equals: template.id,
                            mode: 'insensitive'
                        }
                    }
                });

                // Combine template with its fields
                data = {
                    ...template,
                    fields: fields
                };
            }
        } else {
            // Get all templates
            const templates = await prisma.aquaTemplate.findMany({
                where: {
                    OR: [
                        {
                            owner: request.user?.address
                        },
                        {
                            public: true
                        }
                    ]
                }
            });
            data = [];

            // For each template, get its fields
            for (let template of templates) {
                const fields = await prisma.aquaTemplateFields.findMany({
                    where: {
                        aqua_form_id: {
                            equals: template.id,
                            mode: 'insensitive'
                        }
                    }
                });

                data.push({
                    ...template,
                    fields: fields
                });
            }
        }

        return reply.code(200).send({ success: true, data });
    });

    interface TemplateParams {
        templateId: string;
    }

    fastify.delete<{
        Params: {
            templateId: string;
        },

    }>('/templates/:templateId', { preHandler: authenticate }, async (request: FastifyRequest & AuthenticatedRequest, reply) => {

        // const { templateId } = request.params;

        const req = request as FastifyRequest<{ Params: TemplateParams }> & AuthenticatedRequest;
        const { templateId } = req.params;

        if (!templateId) {
            return reply.code(403).send({ success: false });
        }

        if (!request.user?.address) {
            return reply.code(401).send({ success: false, message: 'user address not found' });
        }
        try {

            // fetch the template
            let results = await prisma.latest.findFirst({
                where: {
                    template_id: templateId
                }
            })


            if (results != null) {


                let response = await deleteAquaTreeFromSystem(request.user?.address ?? "-", results.hash)

                if (response[0] != 200) {
                    return reply.code(response[0]).send({ success: response[0] == 200 ? true : false, message: response[1] });

                }
            }


            // Delete associated form fields first
            await prisma.aquaTemplateFields.deleteMany({
                where: {
                    aqua_form_id: templateId
                }
            });

            // Then delete the form itself
            await prisma.aquaTemplate.delete({
                where: {
                    id: templateId
                }
            });

            return reply.code(200).send({ success: true });
        } catch (error) {
            return reply.code(500).send({ success: false, error: "Failed to delete template" });
        }
    });

    // Function to validate that a JSON object conforms to DataModel interface
    function validateAquaModel(data: AquaFormRequest): [boolean, string] {
        let reason = "";

        // Check that all required top-level properties exist
        if (!data.id) {
            reason = "Missing required field: id";
            return [false, reason];
        }

        if (!data.name) {
            reason = "Missing required field: name";
            return [false, reason];
        }

        if (!data.title) {
            reason = "Missing required field: title";
            return [false, reason];
        }

        if (!Array.isArray(data.fields)) {
            reason = "Missing or invalid fields array";
            return [false, reason];
        }

        // Check that all fields have the required properties
        for (let i = 0; i < data.fields.length; i++) {
            const field = data.fields[i];

            if (!field.id) {
                reason = `Field at index ${i} is missing required property: id`;
                return [false, reason];
            }

            if (!field.label) {
                reason = `Field at index ${i} is missing required property: label`;
                return [false, reason];
            }

            if (!field.name) {
                reason = `Field at index ${i} is missing required property: name`;
                return [false, reason];
            }

            if (!field.type) {
                reason = `Field at index ${i} is missing required property: type`;
                return [false, reason];
            }

            // Note: "required" property can be omitted and will default to false in TypeScript
            if (field.required === undefined) {
                field.required = false;
            }
        }

        // If we made it here, validation passed
        return [true, ""];
    }

    fastify.post('/templates', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
        const aquaFormdata = request.body as AquaFormRequest;

        let [isValid, reason] = validateAquaModel(aquaFormdata);

        if (!isValid) {
            return reply.code(400).send({ success: false, message: reason });
        }

        try {
            // Create the main form
            await prisma.aquaTemplate.create({
                data: {
                    id: aquaFormdata.id,
                    name: aquaFormdata.name,
                    owner: request.user?.address || '',
                    title: aquaFormdata.title,
                    created_at: new Date().toISOString(),
                    public: false
                }
            });

            // Create each form field
            for (const field of aquaFormdata.fields) {
                await prisma.aquaTemplateFields.create({
                    data: {
                        aqua_form_id: aquaFormdata.id,
                        name: field.name,
                        label: field.label,
                        type: field.type,
                        required: field.required ?? true
                    }
                });
            }

            let aquafier = new Aquafier();

            // create aqua tree for identity template
            let identityFileObject: FileObject = {
                fileContent: JSON.stringify(aquaFormdata.fields),
                fileName: `${aquaFormdata.name}.json`,
                path: "./"
            }

            let resIdentityAquaTree = await aquafier.createGenesisRevision(identityFileObject, true, false, false)

            if (resIdentityAquaTree.isOk()) {

                // save the aqua tree 
                await saveAquaTree(resIdentityAquaTree.data.aquaTree!!, request.user?.address!!, aquaFormdata.id)
                //safe json file 
                await saveTemplateFileData(resIdentityAquaTree.data.aquaTree!!, JSON.stringify(aquaFormdata.fields), request.user?.address!!)

                let apiFileInfo: {
                    aquaTree: AquaTree,
                    fileObject: FileObject[]
                } = {
                    aquaTree: resIdentityAquaTree.data.aquaTree!!,
                    fileObject: [identityFileObject]

                }
                return reply.code(200).send({ success: true, data: apiFileInfo });
            } else {
                return reply.code(500).send({ success: true, logs: resIdentityAquaTree.data });
            }
        } catch (error) {
            console.error("Error creating template:", error);
            return reply.code(500).send({ success: false, message: "Failed to create template" });
        }
    });

    fastify.put('/templates/:templateId', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
        const aquaFormdata = request.body as AquaFormRequest;

        let [isValid, reason] = validateAquaModel(aquaFormdata);

        if (!isValid) {
            return reply.code(400).send({ success: false, message: reason });
        }

        const { templateId } = request.params as { templateId: string };

        if (!templateId) {
            return reply.code(400).send({ success: false, message: "Missing template ID" });
        }

        try {
            // Create the main form
            await prisma.aquaTemplate.update({
                where: {
                    id: templateId
                },
                data: {
                    name: aquaFormdata.name,
                    owner: request.user?.address || '',
                    title: aquaFormdata.title,
                    created_at: new Date().toISOString(),
                    public: false
                }
            });

            // What is the logic to delete any deleted fields from the frontend, so you should delete them here
            await prisma.aquaTemplateFields.deleteMany({
                where: {
                    aqua_form_id: aquaFormdata.id
                }
            });

            // Create each form field
            for (const field of aquaFormdata.fields) {
                await prisma.aquaTemplateFields.create({
                    data: {
                        aqua_form_id: aquaFormdata.id,
                        name: field.name,
                        label: field.label,
                        type: field.type,
                        required: field.required ?? true
                    }
                });
            }

            return reply.code(200).send({ success: true });
        } catch (error) {
            console.error("Error creating template:", error);
            return reply.code(500).send({ success: false, message: "Failed to create template" });
        }
    });

}


