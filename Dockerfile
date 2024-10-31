FROM node:20.17.0-alpine

WORKDIR /api_gateway

COPY . .

RUN npm install --production

ARG PORT
ARG PORT_DB
ARG DB_SERVICE_NAME

# temporary solution; TODO: create secrets file
ARG SECRET_KEY

ENV PORT=${PORT} PORT_DB=${PORT_DB} DB_SERVICE_NAME=${DB_SERVICE_NAME} SECRET_KEY=${SECRET_KEY}

EXPOSE ${PORT}

CMD [ "npm", "start" ]