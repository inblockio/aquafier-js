import {Client} from "minio";
import * as Minio from 'minio'
import * as process from "node:process";

/**
 * Creates and returns a configured Minio Client using environment variables.
 *
 * Uses:
 * - S3_USER as the Minio accessKey
 * - S3_PASSWORD as the Minio secretKey
 * - S3_URL as the endPoint (defaults to an empty string if unset)
 * - S3_PORT as the port (parsed as a number; defaults to 9000 if unset or empty)
 * - S3_USE_SSL interpreted case-insensitively as 'true'/'false' (defaults to true if unset)
 *
 * @returns A Minio Client configured from the environment variables above.
 */
function getMinioClient(): Client {
    return new Minio.Client({
        accessKey: process.env.S3_USER,
        endPoint: process.env.S3_URL ?? "",
        secretKey: process.env.S3_PASSWORD,
        port: process.env.S3_PORT != undefined && process.env.S3_PORT != "" ? Number(process.env.S3_PORT) : 9000,
        useSSL: process.env.S3_USE_SSL ? (String(process.env.S3_USE_SSL).toLowerCase() === 'true') : true //only dev!!!
    })
}

/**
 * Returns the configured S3 bucket name.
 *
 * @returns The value of the `S3_BUCKET` environment variable if set and non-empty; otherwise `"aquafier"`.
 */
function getBucketName(): string {
    return process.env.S3_BUCKET || 'aquafier';
}

/**
 * Returns whether the Minio/S3 client configuration is fully provided via environment variables.
 *
 * Checks that S3_PASSWORD, S3_USER, S3_URL, and S3_BUCKET are all defined and non-empty in process.env.
 *
 * @returns `true` if all four environment variables are present and non-empty; otherwise `false`.
 */
function minioClientCompleted(): boolean{
    return !!process.env.S3_USER && !!process.env.S3_PASSWORD && !!process.env.S3_URL && !!process.env.S3_BUCKET && !!process.env.DISABLE_S3
}

export {getMinioClient, getBucketName,minioClientCompleted}