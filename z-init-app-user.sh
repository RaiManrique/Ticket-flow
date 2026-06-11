#!/usr/bin/env bash
# Crea el usuario de aplicacion con permisos limitados (RBAC).
# Se ejecuta al final de la inicializacion (prefijo z-).

set -e

: "${MONGO_APP_USER:?Falta MONGO_APP_USER en .env}"
: "${MONGO_APP_PASSWORD:?Falta MONGO_APP_PASSWORD en .env}"

mongosh <<EOF
db = db.getSiblingDB("admin");

const appUser = "${MONGO_APP_USER}";
const existing = db.getUser(appUser);

if (existing) {
  print("Usuario de aplicacion ya existe: " + appUser);
} else {
  db.createUser({
    user: appUser,
    pwd: "${MONGO_APP_PASSWORD}",
    roles: [
      { role: "readWrite", db: "ticketflow_social" }
    ]
  });
  print("Usuario de aplicacion creado: " + appUser);
}
EOF
