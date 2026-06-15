# ── build stage ──
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite 환경값은 빌드 타임에 번들에 박힌다.
#  - VITE_USE_MOCK=false : 실 백엔드(/v1/chat·/v1/transcriptions) 연동
#  - VITE_API_BASE_URL=  : 빈값=상대경로 → 같은 호스트(nginx)가 /v1·/auth 프록시(same-origin)
#  - VITE_AUTH_MOCK=false: 백엔드 OIDC RP(/auth/*) 사용
#  - VITE_DEV_AUTH_TOKEN : STT(/v1/transcriptions) Bearer용 dev JWT (선택, 비우면 STT 인증 실패)
ARG VITE_USE_MOCK=false
ARG VITE_API_BASE_URL=
ARG VITE_AUTH_MOCK=false
ARG VITE_DEV_AUTH_TOKEN=
ENV VITE_USE_MOCK=$VITE_USE_MOCK \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTH_MOCK=$VITE_AUTH_MOCK \
    VITE_DEV_AUTH_TOKEN=$VITE_DEV_AUTH_TOKEN
RUN npm run build

# ── serve stage ──
FROM nginx:1.27-alpine AS runtime
# nginx:alpine 엔트리포인트가 /etc/nginx/templates/*.template 를 envsubst 후 conf.d로 전개한다.
# 프록시 대상은 배포 환경(ns)별로 주입: dev=onramp / tenant1=tenant1-onramp ...
ENV API_UPSTREAM=onramp-api.onramp.svc.cluster.local:8000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
