[< Back](../README.md)

# DOCKER

Installation:

https://docs.docker.com/engine/install/ubuntu/


Post Installation

https://docs.docker.com/engine/install/linux-postinstall/

Docker Compose Installation:

https://docs.docker.com/compose/install/


#
# DOCKER COMMANDS

List Images:

`docker images`

Image Building:

`docker build . -t $IMAGE_NAME`

List Containers

`docker ps`

`docker ps -a`

Container Building:

`docker run -d -p $EXTERNAL_PORT:$INTERNAL_PORT --name $CONTAINER_NAME $IMAGE_NAME`

Remove Unused Images & Containers:

`docker image prune`

`docker container prune`

Remove all containers
`docker rm $(docker ps -aq)`

Container Logs

`docker container logs $CONTAINER_ID`

Volumes

`docker volume create $VOLUME_NAME`

List Volumes

`docker volume ls`