# Extend Node's Alpine Image
FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json & package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY . .

# Expose the port
EXPOSE 5075

# Initialize the API
CMD [ "npm", "start" ]