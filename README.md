# EPOCA CORE API

Epoca Core is an API designed to manage the trading system and can be interacted with through the GUI.


[API Errors](./API_ERRORS.md)


## Requirements

- Docker: v20.10.12

- Docker Compose: v1.29.2




### Local Testing

- NodeJS: v16.14.0

- NPM: v8.3.1

- PostgreSQL: v14





#
## CLI
#

### Database Management Script

This script provides a series of functionalities that enable the database backup and restores. It is only meant to be invoked from `compose`.





#
## Tests
#

*IMPORTANT: These unit tests are designed to be executed inside of the containerized infrastructure. For more information goto `compose/README.md#ContainerizedUnitTests`*

**End-to-end:** `npm run test`

**API Error:** `npm run test-api-error`

**Auth:** `npm run test-auth`

**Candlestick:** `npm run test-candlestick`

**Database:** `npm run test-db`

**GUI Version:** `npm run test-gui-version`

**IP Blacklist:** `npm run test-ip-blacklist`

**Notification:** `npm run test-notification`

**Server:** `npm run test-server`

**Utilities:** `npm run test-utils`