FROM building5/dumb-init:1.2.1 as init

FROM postgres:latest
COPY --from=init /dumb-init /usr/local/bin/

# RUN groupadd -r postgres && useradd --no-log-init -r -g postgres postgres

# COPY conf/init_database.sql	/docker-entrypoint-initdb.d/
# RUN chown -R postgres:postgres /docker-entrypoint-initdb.d
# RUN chmod 644 /docker-entrypoint-initdb.d/init_database.sql

USER postgres:postgres
ENTRYPOINT ["/usr/local/bin/dumb-init", "--"]
EXPOSE 5432

