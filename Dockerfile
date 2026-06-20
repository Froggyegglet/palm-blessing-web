FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

ENV HOST=0.0.0.0
ENV PORT=4173
ENV PALM_BLESSING_DATA_DIR=/data/palm-blessing

EXPOSE 4173

CMD ["npm", "start"]

