FROM mcr.microsoft.com/playwright:v1.53.1-noble

WORKDIR /build
COPY package.json .
COPY package-lock.json .

RUN yarn install

RUN npx playwright install chromium

WORKDIR /build/e2e
COPY e2e .

WORKDIR /build

CMD ["npx", "playwright", "test"]
