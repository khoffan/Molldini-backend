# stage#1 build
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install
RUN npx prisma generate

COPY . .

RUN npm run build

# Stage 2: Run
FROM node:22-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy เฉพาะสิ่งที่จำเป็นมาจาก builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# กำหนด Port (Render จะส่ง PORT มาให้ผ่าน Env)
EXPOSE 10000

# รัน migration และเริ่ม Server
CMD npx prisma migrate deploy && node dist/index.js

