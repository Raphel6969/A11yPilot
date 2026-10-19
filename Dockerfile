FROM node:20.18.1-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/reporters/package.json packages/reporters/package.json
COPY packages/cli/package.json packages/cli/package.json
RUN npm ci --ignore-scripts --no-audit --no-fund
RUN npx playwright install --with-deps chromium
COPY . .
RUN npm run typecheck && npm run test:all && npm run build

FROM node:20.18.1-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/packages/core/package.json packages/core/package.json
COPY --from=build /app/packages/reporters/package.json packages/reporters/package.json
COPY --from=build /app/packages/cli/package.json packages/cli/package.json
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --from=build /app/dist-ui ./dist-ui
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/reporters/dist ./packages/reporters/dist
COPY --from=build /app/packages/cli/dist ./packages/cli/dist
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
