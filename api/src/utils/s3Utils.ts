import {Client} from "minio";
import * as Minio from 'minio'
import * as process from "node:process";

function getMinioClient(): Client {
    return new Minio.Client({
        accessKey: process.env.S3_ACCESSKEY,
        endPoint: process.env.S3_URL,
        secretKey: process.env.S3_SECRETKEY,
        port: process.env.S3_PORT || 9000,
        useSSL: process.env.S3_USE_SSL ? (String(process.env.S3_USE_SSL).toLowerCase() === 'true') : true //only dev!!!
    })
}

function getBucketName(): string {
    return process.env.S3_BUCKET || 'aquafier';
}

function minioClientCompleted(): boolean{
    return !!process.env.S3_SECRETKEY && !!process.env.S3_ACCESSKEY && !!process.env.S3_URL && !!process.env.S3_BUCKET
}

export {getMinioClient, getBucketName,minioClientCompleted}