[< Back](../README.md)

# POSTGRES


##
## Installation

https://www.postgresql.org/download/linux/ubuntu/

### Script

sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get -y install postgresql-14

##
## Commands

PSQL TOOL: `sudo -u postgres psql`

List Databases: `\l`

Select Database: `\c plutus;`

Start Service: `sudo service postgresql start`

Stop Service: `sudo service postgresql stop`


##
## Database User

Setup the password on the postgres user: 

`ALTER USER postgres WITH PASSWORD 'C*KQiVaNdBYm,J#q$VU83kkSk|o)J6m.d#6A,$}r1XeKMd2g~d';`

*Important: The password specified above will be the one used for dev. The production machine has a different password.

##
## Clusters

https://gorails.com/guides/upgrading-postgresql-version-on-ubuntu-server

Display installed versions: `dpkg --get-selections | grep postgres`

Installed Clusters: `pg_lsclusters`

Change Cluster's Port: `sudo gedit /etc/postgresql/14/main_pristine/postgresql.conf`

##### Change the port to 5432