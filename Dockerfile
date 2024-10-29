FROM node:20.17.0-alpine

WORKDIR /api_gateway

COPY . .

RUN npm install

ARG PORT

ENV PORT=${PORT}

EXPOSE ${PORT}

CMD [ "npm", "start" ]