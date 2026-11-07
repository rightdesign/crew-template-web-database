# Built by .github/workflows/deploy.yml; the app host runs the image.
FROM node:24.19.0-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY dist ./dist
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
USER node
CMD ["node", "src/index.mjs"]
