# Use official Node.js image
FROM node:18

# Create working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your project
COPY . .

# Expose the port your app runs on
EXPOSE 3001

# Start your app
CMD ["npm", "start"]
