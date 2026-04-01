# Use the official Node.js 18 image as base
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Ensure the data directory exists and has permissions
RUN mkdir -p data && chmod -R 777 data

# Hugging Face Spaces typically use port 7860 by default
ENV PORT=7860
EXPOSE 7860

# Start the server
CMD [ "npm", "start" ]
