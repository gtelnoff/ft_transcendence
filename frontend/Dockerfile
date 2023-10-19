FROM building5/dumb-init:1.2.1 as init

FROM node:18

WORKDIR /usr/src/app
COPY --from=init /dumb-init /usr/local/bin/
COPY package*.json ./
RUN npm install
RUN npm install -g @angular/cli
COPY . .
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/dumb-init", "--"]
CMD ["ng", "serve", "--host", "0.0.0.0" , "--port" , "8080"]