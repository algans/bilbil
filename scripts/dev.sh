#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Bilbil — Lokal geliştirme yöneticisi
#
# Kullanım:
#   ./scripts/dev.sh start    Tüm servisleri başlat (docker + db + dev server)
#   ./scripts/dev.sh stop     Tüm servisleri durdur (process'ler + docker)
#   ./scripts/dev.sh restart  Stop + start
#   ./scripts/dev.sh status   Hangi servis ayakta?
#   ./scripts/dev.sh logs     Dev server log'larını canlı izle (tail -f)
#   ./scripts/dev.sh clean    Stop + Docker volume sil (DİKKAT: tüm DB verisi gider)
#   ./scripts/dev.sh help     Bu yardımı göster
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

APP_PORT=3000
DB_PORT=5435
DB_CONTAINER="bilbil-postgres"
DEV_LOG="$PROJECT_ROOT/.bilbil-dev.log"
DEV_PID_FILE="$PROJECT_ROOT/.bilbil-dev.pid"
READY_TIMEOUT=45  # saniye

# ─── Renkli output ───────────────────────────────────────────────────────────
if [ -t 1 ]; then
  C_RED=$'\033[0;31m'
  C_GREEN=$'\033[0;32m'
  C_YELLOW=$'\033[1;33m'
  C_BLUE=$'\033[0;34m'
  C_DIM=$'\033[2m'
  C_BOLD=$'\033[1m'
  C_NC=$'\033[0m'
else
  C_RED="" C_GREEN="" C_YELLOW="" C_BLUE="" C_DIM="" C_BOLD="" C_NC=""
fi

log_info()    { printf "${C_BLUE}▸${C_NC} %s\n" "$1"; }
log_success() { printf "${C_GREEN}✓${C_NC} %s\n" "$1"; }
log_warn()    { printf "${C_YELLOW}⚠${C_NC} %s\n" "$1"; }
log_error()   { printf "${C_RED}✗${C_NC} %s\n" "$1" >&2; }
log_step()    { printf "\n${C_BOLD}%s${C_NC}\n" "$1"; }
log_dim()     { printf "${C_DIM}  %s${C_NC}\n" "$1"; }

# ─── Helpers ─────────────────────────────────────────────────────────────────
docker_running()      { docker info >/dev/null 2>&1; }
db_container_up()     { docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; }
db_container_exists() { docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; }
app_listening()       { lsof -ti:"$APP_PORT" >/dev/null 2>&1; }
node_modules_ok()     { [ -d "$PROJECT_ROOT/node_modules" ] && [ -d "$PROJECT_ROOT/node_modules/next" ]; }
env_file_ok()         { [ -f "$PROJECT_ROOT/.env" ]; }

# Postgres'in connection kabul ettiğini kontrol et (docker exec ile)
db_ready() {
  docker exec "$DB_CONTAINER" pg_isready -U bilbil -d bilbil >/dev/null 2>&1
}

# Postgres ready olana kadar bekle
wait_for_db() {
  local elapsed=0
  while [ $elapsed -lt $READY_TIMEOUT ]; do
    if db_ready; then return 0; fi
    sleep 1
    elapsed=$((elapsed + 1))
    if [ $((elapsed % 5)) -eq 0 ]; then
      log_dim "hala bekleniyor... (${elapsed}s)"
    fi
  done
  return 1
}

# Dev server HTTP 200 verene kadar bekle
wait_for_app() {
  local elapsed=0
  while [ $elapsed -lt $READY_TIMEOUT ]; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}" 2>/dev/null | grep -q "^[23]"; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
    if [ $((elapsed % 5)) -eq 0 ]; then
      log_dim "hala bekleniyor... (${elapsed}s) — log: $DEV_LOG"
    fi
  done
  return 1
}

# Dev process tree'sini öldür (npm parent + tsx + next + socket.io child'lar)
kill_dev_process() {
  # 1. PID file varsa: parent process group'unu öldür
  if [ -f "$DEV_PID_FILE" ]; then
    local pid
    pid=$(cat "$DEV_PID_FILE" 2>/dev/null || echo "")
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      # Process group ID al, tüm grubu öldür (alt process'ler dahil)
      local pgid
      pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ' || echo "")
      if [ -n "$pgid" ]; then
        kill -TERM -- "-$pgid" 2>/dev/null || true
        sleep 2
        kill -KILL -- "-$pgid" 2>/dev/null || true
      else
        kill -TERM "$pid" 2>/dev/null || true
        sleep 1
        kill -KILL "$pid" 2>/dev/null || true
      fi
    fi
    rm -f "$DEV_PID_FILE"
  fi

  # 2. Fallback: port'u dinleyen kalan process'leri öldür
  if app_listening; then
    local pids
    pids=$(lsof -ti:"$APP_PORT" 2>/dev/null || echo "")
    if [ -n "$pids" ]; then
      log_dim "port ${APP_PORT}'da kalan process'ler: $pids"
      echo "$pids" | xargs -r kill -KILL 2>/dev/null || true
    fi
  fi
}

# ─── Komutlar ────────────────────────────────────────────────────────────────

cmd_start() {
  log_step "Bilbil başlatılıyor..."

  # 1. Docker daemon
  if ! docker_running; then
    log_error "Docker daemon çalışmıyor."
    log_dim "Docker Desktop'ı açın ve tekrar deneyin."
    exit 1
  fi
  log_success "Docker daemon aktif"

  # 2. .env
  if ! env_file_ok; then
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
      log_warn ".env yok, .env.example'dan kopyalanıyor..."
      cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
      log_warn "AUTH_SECRET değerini production öncesi değiştirmeyi unutmayın."
    else
      log_error ".env de .env.example da bulunamadı"
      exit 1
    fi
  fi
  log_success ".env mevcut"

  # 3. node_modules
  if ! node_modules_ok; then
    log_warn "node_modules eksik veya bozuk, npm install çalıştırılıyor..."
    npm install
  fi
  log_success "Bağımlılıklar mevcut"

  # 4. Postgres container
  if db_container_up; then
    log_success "Postgres zaten çalışıyor (port ${DB_PORT})"
  else
    log_info "Postgres başlatılıyor (port ${DB_PORT})..."
    if ! docker compose up -d postgres >/dev/null 2>&1; then
      log_error "Postgres başlatılamadı"
      log_dim "Detay için: docker compose logs postgres"
      exit 1
    fi
    log_success "Postgres container ayağa kalktı"
  fi

  # 5. Postgres ready bekle
  log_info "Postgres connection kabul etmesi bekleniyor..."
  if ! wait_for_db; then
    log_error "Postgres ${READY_TIMEOUT}s içinde ready olmadı"
    log_dim "docker compose logs postgres komutuyla logları inceleyin"
    exit 1
  fi
  log_success "Postgres ready"

  # 6. Prisma generate (idempotent, hızlı)
  log_info "Prisma client generate ediliyor..."
  npm run db:generate >/dev/null 2>&1 || {
    log_error "Prisma generate başarısız"
    exit 1
  }

  # 7. Prisma migrations (sadece pending'leri uygula, interactive değil)
  log_info "Prisma migrations uygulanıyor..."
  if ! npx prisma migrate deploy >/dev/null 2>&1; then
    log_warn "migrate deploy başarısız, schema değişikliği olabilir"
    log_dim "Yeni migration oluşturmak için: npm run db:migrate"
  fi
  log_success "Migrations güncel"

  # 8. App port kontrolü
  if app_listening; then
    log_warn "Port ${APP_PORT} zaten dinleniyor"
    local existing_pid
    existing_pid=$(lsof -ti:"$APP_PORT" | head -1)
    log_dim "Mevcut PID: $existing_pid"
    log_dim "Önce './scripts/dev.sh stop' çalıştırın veya farklı port kullanın"
    exit 1
  fi

  # 9. Dev server'ı background'da başlat
  # macOS'ta setsid yok; nohup + & ile detach ediyoruz, stop'ta hem PID hem
  # port-listener fallback ile child process'leri yakalıyoruz.
  log_info "Next.js + Socket.IO başlatılıyor..."
  : > "$DEV_LOG"  # log dosyasını temizle
  nohup npm run dev >"$DEV_LOG" 2>&1 < /dev/null &
  local dev_pid=$!
  echo "$dev_pid" > "$DEV_PID_FILE"
  log_dim "PID: $dev_pid · log: $DEV_LOG"

  # 10. App ready bekle
  log_info "Server hazır olması bekleniyor..."
  if ! wait_for_app; then
    log_error "Server ${READY_TIMEOUT}s içinde HTTP 200 vermedi"
    log_dim "Son loglar:"
    tail -20 "$DEV_LOG" | sed 's/^/    /'
    exit 1
  fi

  log_step "🎉 Bilbil hazır!"
  printf "  ${C_BOLD}URL:${C_NC}     http://localhost:%s\n" "$APP_PORT"
  printf "  ${C_BOLD}DB:${C_NC}      postgres://bilbil@localhost:%s/bilbil\n" "$DB_PORT"
  printf "  ${C_BOLD}Logs:${C_NC}    ./scripts/dev.sh logs\n"
  printf "  ${C_BOLD}Stop:${C_NC}    ./scripts/dev.sh stop\n"
}

cmd_stop() {
  log_step "Bilbil durduruluyor..."

  # 1. Dev server process'lerini öldür
  if [ -f "$DEV_PID_FILE" ] || app_listening; then
    log_info "Dev server kapatılıyor..."
    kill_dev_process
    sleep 1
    if app_listening; then
      log_warn "Port ${APP_PORT} hala dinleniyor"
    else
      log_success "Dev server durdu"
    fi
  else
    log_dim "Dev server zaten kapalı"
  fi

  # 2. Docker compose down
  if docker_running; then
    if db_container_exists; then
      log_info "Docker container'ları durduruluyor..."
      docker compose down >/dev/null 2>&1
      log_success "Docker container'ları durdu (volume korundu)"
    else
      log_dim "Docker container yok"
    fi
  else
    log_warn "Docker daemon kapalı, atlandı"
  fi

  log_success "Tüm servisler durdu"
}

cmd_restart() {
  cmd_stop
  echo ""
  cmd_start
}

cmd_status() {
  log_step "Bilbil servis durumu"

  # Docker daemon
  if docker_running; then
    log_success "Docker daemon: aktif"
  else
    log_error "Docker daemon: kapalı"
  fi

  # Postgres container
  if db_container_up; then
    log_success "Postgres container: çalışıyor (port ${DB_PORT})"
    if db_ready; then
      log_dim "└─ connection: ready"
    else
      log_dim "└─ connection: bekliyor (henüz ready değil)"
    fi
  elif db_container_exists; then
    log_warn "Postgres container: var ama durmuş"
  else
    log_dim "Postgres container: yok"
  fi

  # Dev server
  if app_listening; then
    local pid
    pid=$(lsof -ti:"$APP_PORT" | head -1)
    log_success "Dev server: çalışıyor (PID $pid, port ${APP_PORT})"
    if [ -f "$DEV_PID_FILE" ]; then
      log_dim "└─ kayıtlı PID: $(cat "$DEV_PID_FILE")"
    fi
  else
    log_dim "Dev server: kapalı"
  fi

  # Build artifacts
  if [ -d "$PROJECT_ROOT/.next" ]; then
    log_dim "Next.js cache mevcut (.next/)"
  fi
}

cmd_logs() {
  if [ ! -f "$DEV_LOG" ]; then
    log_error "Log dosyası bulunamadı: $DEV_LOG"
    log_dim "Önce './scripts/dev.sh start' çalıştırın"
    exit 1
  fi
  log_info "Dev server log'u (Ctrl+C ile çık)"
  log_dim "Dosya: $DEV_LOG"
  echo ""
  tail -f "$DEV_LOG"
}

cmd_clean() {
  log_step "⚠ Clean mode — tüm runtime + DB verisi silinecek"
  printf "${C_YELLOW}Bu işlem geri alınamaz. Devam etmek için 'evet' yazın:${C_NC} "
  read -r confirm
  if [ "$confirm" != "evet" ]; then
    log_warn "İptal edildi"
    exit 0
  fi

  cmd_stop
  log_info "Docker volume'ler siliniyor..."
  docker compose down -v >/dev/null 2>&1 || true
  log_info "Next.js cache siliniyor..."
  rm -rf "$PROJECT_ROOT/.next"
  log_info "Test artifacts siliniyor..."
  rm -rf "$PROJECT_ROOT/test-results" "$PROJECT_ROOT/playwright-report" "$PROJECT_ROOT/coverage"
  log_info "Log dosyası siliniyor..."
  rm -f "$DEV_LOG" "$DEV_PID_FILE"
  log_success "Temizlik tamam. './scripts/dev.sh start' ile sıfırdan başlayabilirsiniz."
}

cmd_help() {
  cat <<EOF
${C_BOLD}Bilbil — Lokal geliştirme yöneticisi${C_NC}

${C_BOLD}Kullanım:${C_NC}
  ./scripts/dev.sh ${C_GREEN}<komut>${C_NC}

${C_BOLD}Komutlar:${C_NC}
  ${C_GREEN}start${C_NC}    Tüm servisleri başlat (docker + db + dev server)
  ${C_GREEN}stop${C_NC}     Tüm servisleri durdur (process'ler + docker)
  ${C_GREEN}restart${C_NC}  stop + start
  ${C_GREEN}status${C_NC}   Hangi servisler ayakta?
  ${C_GREEN}logs${C_NC}     Dev server log'larını canlı izle
  ${C_GREEN}clean${C_NC}    Stop + Docker volume sil ${C_RED}(DİKKAT: DB verisi gider)${C_NC}
  ${C_GREEN}help${C_NC}     Bu yardımı göster

${C_BOLD}Örnekler:${C_NC}
  ./scripts/dev.sh start    # → http://localhost:${APP_PORT}
  ./scripts/dev.sh logs     # canlı log izleme
  ./scripts/dev.sh stop     # her şeyi durdur

${C_BOLD}Detaylar:${C_NC}
  - App port: ${APP_PORT}
  - DB port:  ${DB_PORT} (docker container: ${DB_CONTAINER})
  - Log:      ${DEV_LOG}
EOF
}

# ─── Router ──────────────────────────────────────────────────────────────────
case "${1:-help}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_restart ;;
  status)  cmd_status ;;
  logs)    cmd_logs ;;
  clean)   cmd_clean ;;
  help|-h|--help) cmd_help ;;
  *)
    log_error "Bilinmeyen komut: $1"
    echo ""
    cmd_help
    exit 1
    ;;
esac
