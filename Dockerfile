FROM node:20-alpine

WORKDIR /app

# Копируем манифесты зависимостей
COPY package*.json ./

# Устанавливаем все зависимости (включая devDependencies для сборки vite и esbuild)
RUN npm install

# Копируем остальной исходный код
COPY . .

# Собираем клиентскую часть (dist/index.html + assets) и серверный бандл (dist/server.cjs)
RUN npm run build

# Порт приложения
EXPOSE 3000

ENV NODE_ENV=production

# Запуск сервера
CMD ["npm", "run", "start"]
