// Contact form controller for handling contact submissions
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import Logger from "../utils/logger";

// If using Resend (recommended):
// npm install resend
// import { Resend } from 'resend';
// const resend = new Resend(process.env.RESEND_API_KEY);

// If using Nodemailer:
// npm install nodemailer
// import nodemailer from 'nodemailer';

interface ContactFormBody {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export default async function contactController(fastify: FastifyInstance) {
    // Handle contact form submissions
    fastify.post<{
        Body: ContactFormBody
    }>('/contact', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { name, email, subject, message } = request.body as ContactFormBody;

            // Validate input
            if (!name || !email || !subject || !message) {
                return reply.code(400).send({
                    success: false,
                    error: 'All fields are required'
                });
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return reply.code(400).send({
                    success: false,
                    error: 'Invalid email address'
                });
            }

            // OPTION 1: Using Resend (Modern, recommended)
            // Uncomment this block if you use Resend
            /*
            const { data, error } = await resend.emails.send({
                from: 'Contact Form <noreply@yourdomain.com>',
                to: ['demo@inblock.io'],
                replyTo: email,
                subject: `Contact Form: ${subject}`,
                html: `
                    <h2>New Contact Form Submission</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Message:</strong></p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                `
            });

            if (error) {
                Logger.error('Resend error:', error);
                return reply.code(500).send({
                    success: false,
                    error: 'Failed to send email'
                });
            }
            */

            // OPTION 2: Using Nodemailer (More flexible, self-hosted)
            // Uncomment this block if you use Nodemailer
            /*
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@yourdomain.com',
                to: 'demo@inblock.io',
                replyTo: email,
                subject: `Contact Form: ${subject}`,
                html: `
                    <h2>New Contact Form Submission</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Message:</strong></p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                `
            });
            */

            // Log the submission
            Logger.info(`Contact form submission from ${email}`);

            // For now, just log it (replace with actual email sending above)
            Logger.debug('Contact form submission:', { name, email, subject, message });

            return reply.code(200).send({
                success: true,
                message: 'Message sent successfully'
            });

        } catch (error: any) {
            Logger.error('Error processing contact form:', error);
            return reply.code(500).send({
                success: false,
                error: 'Failed to process contact form'
            });
        }
    });
}
