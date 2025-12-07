FROM node:16-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Set up the application
COPY package*.json ./
RUN npm install

# Expose development server port
EXPOSE 8080

# Command to run
CMD ["npm", "start"]
