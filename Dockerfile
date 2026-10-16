FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY public ./public
USER node
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "server/index.js"]
