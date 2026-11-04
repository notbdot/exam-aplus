FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json server.mjs ./
COPY web ./web
COPY tools/healthcheck.mjs tools/setup-link.mjs ./tools/
RUN mkdir /data && chown node:node /data
USER node
ENV PORT=3000 DATA_DIR=/data ORIGIN=http://localhost:3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["node","tools/healthcheck.mjs"]
CMD ["node","server.mjs"]
