FROM building5/dumb-init:1.2.1 as init

FROM node:18 as build
WORKDIR /usr/src/app
COPY package*.json ./
COPY --from=init /dumb-init /usr/local/bin/
RUN npm install
COPY . .
RUN npm run build
ENTRYPOINT ["/usr/local/bin/dumb-init", "--"]
CMD ["npm", "run", "start:dev"]
