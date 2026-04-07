FROM node:20-slim AS build

WORKDIR /app

# Install root deps
COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts

# Install client deps and build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Install server deps and build
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install
COPY server/ ./server/
RUN cd server && npm run build

# Production image
FROM node:20-slim

WORKDIR /app

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/client/dist ./client/dist

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/dist/index.js"]
