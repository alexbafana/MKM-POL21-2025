FROM node:22.14.0-bookworm-slim

RUN apt-get update \
    && apt-get install --yes --no-install-recommends bash ca-certificates git make g++ python3 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install --global corepack@0.31.0 && corepack enable

WORKDIR /artifact
COPY . .

RUN corepack yarn install --immutable

CMD ["bash", "reproducibility/paper-b/scripts/reproduce.sh"]
