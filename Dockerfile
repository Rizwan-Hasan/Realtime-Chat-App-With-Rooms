FROM node:14.17.1-alpine

RUN mkdir -p /home/node/app
RUN chown -R node:node /home/node/app

USER node

WORKDIR /home/node/app

COPY package*.json ./

RUN npm install

COPY --chown=node:node . .

EXPOSE 3000

CMD ["npm", "run", "devStart"]

