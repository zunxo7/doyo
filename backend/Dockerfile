FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY tsconfig.json ./
COPY src ./src
ENV NODE_ENV=production PORT=8787 DB_FILE=/data/doyo.db
VOLUME /data
EXPOSE 8787
CMD ["npx", "tsx", "src/index.ts"]
