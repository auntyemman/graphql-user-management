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

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /src/app

# Copy necessary files from the build stage
COPY --from=build /src/app/dist ./dist
COPY --from=build /src/app/node_modules ./node_modules
COPY --from=build /src/app/package*.json ./
COPY --from=build /src/app/.env ./
COPY --from=build /src/app/prisma ./prisma

# Expose the port
EXPOSE 3000

# Run the application
CMD ["npm", "run", "start:prod"]
