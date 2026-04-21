# alunad-docker
Proyecto Tienda Humus Alunad - Microservicios Node.js dockerizados con HAProxy y Docker Swarm

## Objetivo Principal

Dockerizar una aplicación de e-commerce de productos ecológicos basada en 3 microservicios Node.js, desplegarla con Docker Compose, configurar HAProxy como balanceador de carga, implementar Docker Swarm con placement constraints, y realizar pruebas de carga con JMeter.

---

## Arquitectura del Proyecto

Cliente → alunad.com (Apache - 192.168.100.3 - servidorUbuntu2)
        → HAProxy :8080 (192.168.100.3 - servidorUbuntu2)
            → productos-service :3000 (192.168.100.2 - servidorUbuntu1)
            → usuarios-service  :3001 (192.168.100.2 - servidorUbuntu1)
            → ordenes-service   :3002 (192.168.100.2 - servidorUbuntu1)
        → MySQL x3 (contenedores en 192.168.100.2)

---

## Servidores

- **servidorUbuntu1** → 192.168.100.2 → Backend (Node.js + MySQL en Docker)  
- **servidorUbuntu2** → 192.168.100.3 → Frontend (Apache) + HAProxy en Docker 

## Estructura de carpetas en servidorUbuntu1:
```
/root/alunad-docker/
├── docker-compose.yml
├── productos/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── controllers/productosController.js
│       └── models/productosModel.js
├── usuarios/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── controllers/usuariosController.js
│       └── models/usuariosModel.js
├── ordenes/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── controllers/ordenesController.js
│       └── models/ordenesModel.js
├── haproxy/
│   ├── haproxy.cfg
│   └── docker-compose.yml
├── frontend/
│   ├── admin.html
│   ├── cliente.html
│   ├── index.html
│   ├── css/
│   └── js/
│       ├── config.js
│       ├── admin.js
│       ├── auth.js
│       └── cliente.js
├── productos_abonos.sql
├── usuarios_abonos.sql
└── ordenes_abonos.sql
```

## docker-compose.yml (servidorUbuntu1) Backend:
```yaml
services:
  productos-db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: mysql
      MYSQL_DATABASE: productos_abonos
    volumes:
      - productos-db-data:/var/lib/mysql
      - ./productos_abonos.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - alunad-net

  productos-service:
    build: ./productos
    environment:
      DB_HOST: productos-db
      DB_USER: root
      DB_PASSWORD: mysql
      DB_NAME: productos_abonos
    ports:
      - "3000:3000"
    depends_on:
      - productos-db
    networks:
      - alunad-net

  usuarios-db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: mysql
      MYSQL_DATABASE: usuarios_abonos
    volumes:
      - usuarios-db-data:/var/lib/mysql
      - ./usuarios_abonos.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - alunad-net

  usuarios-service:
    build: ./usuarios
    environment:
      DB_HOST: usuarios-db
      DB_USER: root
      DB_PASSWORD: mysql
      DB_NAME: usuarios_abonos
    ports:
      - "3001:3001"
    depends_on:
      - usuarios-db
    networks:
      - alunad-net

  ordenes-db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: mysql
      MYSQL_DATABASE: ordenes_abonos
    volumes:
      - ordenes-db-data:/var/lib/mysql
      - ./ordenes_abonos.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - alunad-net

  ordenes-service:
    build: ./ordenes
    environment:
      DB_HOST: ordenes-db
      DB_USER: root
      DB_PASSWORD: mysql
      DB_NAME: ordenes_abonos
      PRODUCTOS_URL: http://productos-service:3000
      USUARIOS_URL: http://usuarios-service:3001
    ports:
      - "3002:3002"
    depends_on:
      - ordenes-db
      - productos-service
      - usuarios-service
    networks:
      - alunad-net

volumes:
  productos-db-data:
  usuarios-db-data:
  ordenes-db-data:

networks:
  alunad-net:
    driver: bridge
```
## Configuración HAProxy haproxy.cfg (servidorUbuntu2 en ~/haproxy-alunad/):
```
    global
    log stdout format raw local0
    maxconn 4096

defaults
    log     global
    mode    http
    option  httplog
    timeout connect 5s
    timeout client  30s
    timeout server  30s

frontend http_front
    bind *:80
    acl is_productos     path_beg /api/productos
    acl is_usuarios      path_beg /api/usuarios
    acl is_ordenes       path_beg /api/ordenes
    acl is_domiciliarios path_beg /api/domiciliarios-disponibles
    use_backend productos_back   if is_productos
    use_backend usuarios_back    if is_usuarios
    use_backend ordenes_back     if is_ordenes
    use_backend ordenes_back     if is_domiciliarios

frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s

backend productos_back
    balance roundrobin
    http-request replace-path /api/productos(.*) /productos\1
    server productos1 192.168.100.2:3000 check

backend usuarios_back
    balance roundrobin
    http-request replace-path /api/usuarios(.*) /usuarios\1
    server usuarios1 192.168.100.2:3001 check

backend ordenes_back
    balance roundrobin
    http-request replace-path /api/(.*) /\1
    server ordenes1 192.168.100.2:3002 check

## Configuración Frontend - config.js del frontend:

    const API_CONFIG = {
    PRODUCTOS_URL: 'http://192.168.100.3:8080/api/productos',
    USUARIOS_URL: 'http://192.168.100.3:8080/api/usuarios',
    ORDENES_URL: 'http://192.168.100.3:8080/api/ordenes',
    DOMICILIARIOS_URL: 'http://192.168.100.3:8080/api/domiciliarios-disponibles'
};
```
## Imágenes en DockerHub:

- danielrestrepo13/alunad-productos:latest
- danielrestrepo13/alunad-usuarios:latest
- danielrestrepo13/alunad-ordenes:latest

## Bases de datos MySQL:

- productos_abonos → tabla productos (~2.002 registros)
- usuarios_abonos → tabla usuarios (~4.016 registros)
- ordenes_abonos → tabla ordenes (~4.036 registros)



