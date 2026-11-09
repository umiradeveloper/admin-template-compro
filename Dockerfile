# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:4000
ARG VITE_SITE_URL=http://localhost:3005
ENV VITE_API_URL=$VITE_API_URL VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# ---------- serve ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
