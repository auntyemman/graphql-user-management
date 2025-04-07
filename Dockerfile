# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /src/app

# Copy package.json and lock files first
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install only production dependencies to reduce image size
RUN npm install --omit=dev --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build the application
# RUN npm run build


# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /src/app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S mostafa -G appgroup
USER mostafa

# Copy necessary files from the build stage
COPY --from=build --chown=mostafa:appgroup /src/app/dist ./dist
COPY --from=build --chown=mostafa:appgroup /src/app/node_modules ./node_modules
COPY --from=build --chown=mostafa:appgroup /src/app/package*.json ./
COPY --from=build --chown=mostafa:appgroup /src/app/.env ./
COPY --from=build --chown=mostafa:appgroup /src/app/prisma ./prisma

# RUN prisma generate
# RUN prisma migrate deploy

# Expose the port
EXPOSE 3000

# Run the application
CMD ["npm", "run", "start:prod"]
