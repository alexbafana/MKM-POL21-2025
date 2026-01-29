# Slightly heavier than alpine, but much friendlier for native deps (sharp, keccak, etc.)
FROM node:20

# Enable Yarn 3 (Corepack)
RUN corepack enable

# Work directory inside the container
WORKDIR /app

# Copy the whole monorepo (including .yarnrc.yml, .yarn, packages, etc.)
COPY . .

# Install all workspace deps using the pinned Yarn version
RUN corepack yarn install

# Compile contracts to generate typechain-types
RUN corepack yarn hardhat:compile

# Expose:
# - 3000: Next.js frontend
# - 8545: Hardhat chain (internal, optional to expose externally)
EXPOSE 3000 8545

# Start Hardhat chain in background, deploy contracts, build Next.js, then start in production mode.
# Building after deploy ensures deployedContracts.ts is included.
CMD ["sh", "-c", "corepack yarn chain & sleep 15 && corepack yarn deploy && corepack yarn next:build && corepack yarn next:start"]
