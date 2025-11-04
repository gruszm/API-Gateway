FROM node:20.17.0-alpine

WORKDIR /api_gateway

COPY . .

RUN npm install --production

CMD [ "npm", "start" ]