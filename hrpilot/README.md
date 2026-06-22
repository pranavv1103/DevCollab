# HRPilot

Initial scaffold for the HRPilot full-stack application.

## Layout

- `backend/` Spring Boot 3.2 service
- `frontend/` React + Vite app
- `docker-compose.yml` local infrastructure
- `.github/workflows/ci.yml` CI pipeline

## Local start

```bash
docker compose up -d postgres redis zookeeper kafka
cd backend && mvn spring-boot:run
```
