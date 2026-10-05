FROM node:20-alpine

WORKDIR /app

COPY chatbot-service/package.json ./
RUN npm install

COPY chatbot-service/src ./src

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
