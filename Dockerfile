# Slightly heavier than alpine, but much friendlier for native deps (sharp, keccak, etc.)
FROM node:20

# Enable Yarn 3 (Corepack)
RUN corepack enable

# Work directory inside the container
WORKDIR /app

# Copy the whole monorepo (including .yarnrc.yml, .yarn, packages, etc.)
COPY . .

# Install all workspace deps using the pinned Yarn version
RUN yarn install

# Expose:
# - 3000: Next.js frontend
# - 8545: Hardhat chain (internal, optional to expose externally)
EXPOSE 3000 8545

# Start Hardhat chain in background, then start frontend.
# For a quick PoC this is fine.
CMD ["sh", "-c", "yarn chain & sleep 15 && yarn start"]
