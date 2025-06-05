# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install yarn globally
RUN npm install -g yarn

# Copy only package.json and yarn.lock for better caching
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install yarn globally and add a non-root user
RUN npm install -g yarn && \
    addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Add a healthcheck using the Swagger docs path
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/docs || exit 1

# Set the user to run the application
USER appuser

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
