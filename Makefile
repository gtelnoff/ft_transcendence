all : down
	docker compose -f docker-compose.yml up --build --no-attach pgadmin

detached : down
	docker compose --env-file=.env -f docker-compose.yml up --build -d

down :
	docker compose --env-file=.env -f docker-compose.yml down

re : prune all

red : prune detached

rmData :
	docker volume rm ft_transcendence_database

prune :
	docker compose --env-file=.env -f docker-compose.yml down --rmi all
	docker system prune
