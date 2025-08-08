import {Client} from "minio";
import * as Minio from 'minio'
import * as process from "node:process";

function getMinioClient(): Client {
    return new Minio.Client({
        accessKey: process.env.S3_USER,
        endPoint: process.env.S3_URL as string,
        secretKey: process.env.S3_PASSWORD,
        port: parseInt(process.env.S3_PORT as string) || 9000,
        useSSL: process.env.S3_USE_SSL ? (String(process.env.S3_USE_SSL).toLowerCase() === 'true') : true
    })
}

function getBucketName(): string {
    return process.env.S3_BUCKET || 'aquafier';
}

function minioClientCompleted(): boolean{
    return !!process.env.S3_PASSWORD && !!process.env.S3_USER && !!process.env.S3_URL && !!process.env.S3_BUCKET
}

export {getMinioClient, getBucketName,minioClientCompleted}