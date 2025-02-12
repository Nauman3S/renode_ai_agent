FROM --platform=linux/arm64 node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including Tailwind CSS
RUN npm install && \
    npm install -D tailwindcss postcss autoprefixer && \
    npm install -D @monaco-editor/react && \
    npm install -D react-loading framer-motion && \
    npm install -D @headlessui/react axios react-hot-toast react-tabs @heroicons/react

# Copy the rest of the application
COPY . .

# Create Tailwind config file
RUN echo 'module.exports = {content: ["./pages/**/*.{js,ts,jsx,tsx,mdx}","./components/**/*.{js,ts,jsx,tsx,mdx}","./app/**/*.{js,ts,jsx,tsx,mdx}"],theme: {extend: {},},plugins: [],}' > tailwind.config.js

# Create PostCSS config file
RUN echo 'module.exports = {plugins: {"tailwindcss": {},"autoprefixer": {},}}' > postcss.config.js

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]