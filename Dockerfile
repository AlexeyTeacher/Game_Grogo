FROM nginx:alpine

# Copy web app and assets preserving the relative path structure
# game.js uses '../assets/' so web/ and assets/ must be siblings
COPY web/    /usr/share/nginx/html/web/
COPY assets/ /usr/share/nginx/html/assets/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
