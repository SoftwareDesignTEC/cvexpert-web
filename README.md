# Proyecto Programado I – Aplicación Web y Móvil (Fase I)

**Curso:** Diseño de Software  
**Profesor:** Marcos Rodríguez  
**Entrega:** 1 de octubre de 2026  

Aplicación web responsive + aplicación móvil (iOS/Android) con la misma funcionalidad frontend, utilizando Mock Services en Azure API Management. Sin backend real en esta fase.

---

## Estructura del repositorio (Monorepo)

```
proyecto-fase-i/
├── .github/
│   └── workflows/
│       ├── web-ci-cd.yml          # CI/CD de la aplicación web
│       └── mobile-ci-cd.yml       # CI/CD de la aplicación móvil
├── apps/
│   ├── web/                       # Aplicación Web (React + Vite)
│   └── mobile/                    # Aplicación Móvil (React Native / Flutter)
├── packages/
│   └── shared/                    # Código compartido (tipos, utils, constantes)
├── docs/                          # Documentación adicional
├── .gitignore
└── README.md
```

---

## Integrantes y roles

| Persona            | Rol                              |
|--------------------|----------------------------------|
| Samuel Fajardo     | UX/UI + Diseño (Figma)           |
| Justin Mayorga     | Arquitectura + Documentación     |
| Gabriel Pérez      | Frontend Web                     |
| Andrés Zumbado     | Frontend Móvil                   |
| Gabriel Cabrera    | DevOps + Mocks + Integración     |

---

## Requisitos de Fase I (resumen)

- Diseño en Figma (wireframes + mockups)
- Diagrama de arquitectura (Draw.io)
- App web responsive en **Azure Static Web Apps**
- App móvil iOS/Android distribuida por **Firebase App Distribution**
- Mock Services en **Azure API Management** (con paginación y errores)
- CI/CD con **GitHub Actions**
- Tema claro/oscuro, CRUD con paginación y búsqueda, validaciones, Google Auth
- README completo + documento formal

---

## Cómo levantar el proyecto en local

### 1. Aplicación Web

```bash
cd apps/web
npm install
npm run dev
```

### 2. Aplicación Móvil

```bash
cd apps/mobile
# (Instrucciones según el stack elegido: React Native Expo o Flutter)
```

### 3. Variables de entorno

Las variables sensibles (URLs de APIM, keys, etc.) **nunca** se suben al repositorio. Se configuran únicamente en GitHub Secrets y en Azure.

---

## Pipelines

| Workflow              | Qué hace                                      | Se activa cuando...          |
|-----------------------|-----------------------------------------------|------------------------------|
| `web-ci-cd.yml`       | Lint → Build → Deploy a Azure Static Web Apps | Cambios en `apps/web/**`     |
| `mobile-ci-cd.yml`    | Build → Subida a Firebase App Distribution    | Cambios en `apps/mobile/**`  |

---

## Tecnologías principales (Fase I)

- Azure Static Web Apps
- Azure API Management (Consumption) – Mock Services
- GitHub Actions
- Firebase App Distribution
- Google Auth
- Figma + Draw.io

---

## Notas

- Este repositorio contiene **solo la Fase I** (mocks, sin backend real).
- La Fase II (backend completo) se desarrollará en un alcance futuro.
