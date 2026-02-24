FROM node:20-alpine AS builder

WORKDIR /app

# copia somente o projeto real
COPY analisador-copy/package*.json ./

RUN npm ci --no-audit --no-fund

COPY analisador-copy/ .

RUN npm run build


FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]