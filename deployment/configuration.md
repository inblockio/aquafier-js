# Configurations

This page is intended to provide a general overview of what can be controlled via .env files. Since more and more
options are becoming available, it is gradually becoming difficult to keep track of everything.

## Twillio

Is used to connect with Twillio services like SandGrid and others.
Used for E-Mail and Phone-Numer OTP Challenges to issue ID-Claims which are server attested.
Get all veriables via https://twilio.com/. If not present e-mail and phone-number verification will not be available.

TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_VERIFY_SERVICE_SID=""

## S3

We use an S3 storage as the storage backend. By default, an S3 storage is started with the Docker Compose file and
mounts its files externally. If needed, a custom S3 storage (e.g. AWS, if desired) can of course be connected. The
backup and restore routine also supports including the S3 storage in the backup and restoring it if necessary.

### ```S3_USER```

Username for the s3-server authentication

### ```S3_PASSWORD```

Password for the s3-server authentication

### ```S3_BUCKET```

Bucket name that we should use. If it does not exist, we try to create the specified one.

### ```S3_PORT```

s3-Server port

### ```S3_USE_SSL```

Should we check for SSL? For local deployment this must be set to false. It is also not necessary between containers,
since the network traffic is not routed to the internet but only takes place within the Docker network.

## Tracing

When we talk about 'tracing', we usually mean APM powered by Elastic. In this context, the OpenTelemetry client is used,
or alternatively the RUM (Real User Monitoring by Elastic) client. For instructions on how to set these up, please refer
to the deployment. All configs must be set for the application to start with tracing.

### ```TRACING_ENABLE```

Generally controls whether tracing is enabled.

### ```TRACING_SERVICE_NAME```

Should be something like 'aquafier'. It is displayed as the ServerName in the Elastic overview.

### ```TRACING_SECRET```

Please refer to the deployment guide.

### ```TRACING_URL```

Please refer to the deployment guide.

### ```TRACING_ENV```

A service can have an environment such as Dev/Prod/... which serves general clarity. In case of doubt, however, you can
filter by the hostname, so this parameter should be set but is not essential.
