docker-compose up -d
docker exec -t automatic-fabric_mariadb_1 sh -c 'exec mysql -uroot -pmy-secret-pw' < ./db/db.sql
