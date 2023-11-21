deploy-test:
	DOCKER_CONTEXT=dms-test docker compose -f ./deployment/docker-compose.test.yml up --detach --pull always --force-recreate

shell-test:
	-DOCKER_CONTEXT=dms-test docker compose -f ./deployment/docker-compose.test.yml exec -it web bash

logs-test:
	-DOCKER_CONTEXT=dms-test docker compose -f ./deployment/docker-compose.test.yml logs --follow --tail 200 -t

deploy-prod:
	DOCKER_CONTEXT=dms-prod docker compose -f ./deployment/docker-compose.prod.yml up --detach --pull always --force-recreate

shell-prod:
	-DOCKER_CONTEXT=dms-prod docker compose -f ./deployment/docker-compose.prod.yml exec -it web bash

logs-prod:
	-DOCKER_CONTEXT=dms-prod docker compose -f ./deployment/docker-compose.prod.yml logs --follow --tail 200 -t
