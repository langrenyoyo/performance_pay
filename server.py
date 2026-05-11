from __future__ import annotations

import json
import mimetypes
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DB_PATH = Path(os.environ.get("PERF_DB_PATH", DATA_DIR / "performance.db"))
DATABASE_URL = os.environ.get("DATABASE_URL", "")
DB_ENGINE = "postgres" if DATABASE_URL else "sqlite"
HOST = os.environ.get("PERF_HOST", "0.0.0.0")
PORT = int(os.environ.get("PERF_PORT", "5175"))

SCORE_KEYS = ["项目量与工作情况", "代码质量", "响应时效", "其他工作完成情况"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect_sqlite() -> sqlite3.Connection:
    DATA_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def connect_postgres():
    try:
        import psycopg  # type: ignore
        from psycopg.rows import dict_row  # type: ignore
    except ImportError as exc:
        raise RuntimeError("PostgreSQL 模式需要安装依赖：pip install -r requirements.txt") from exc

    return psycopg.connect(DATABASE_URL, autocommit=False, row_factory=dict_row)


def connect():
    if DB_ENGINE == "postgres":
        return connect_postgres()
    return connect_sqlite()


def placeholders(count: int) -> str:
    if DB_ENGINE == "postgres":
        return ", ".join(["%s"] * count)
    return ", ".join(["?"] * count)


def execute(conn, sql: str, params: tuple = ()):
    if DB_ENGINE == "postgres":
        sql = sql.replace("?", "%s")
    return conn.execute(sql, params)


def init_db() -> None:
    with connect() as conn:
        execute(conn, """
        CREATE TABLE IF NOT EXISTS performance_records (
            period TEXT NOT NULL,
            id TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            performance_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
            base_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
            position_salary DOUBLE PRECISION NOT NULL DEFAULT 0,
            manager TEXT NOT NULL DEFAULT '',
            scores_json TEXT NOT NULL DEFAULT '{}',
            note TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (period, id)
        )
        """)
        execute(conn, "CREATE INDEX IF NOT EXISTS idx_records_period_name ON performance_records(period, name)")
        conn.commit()


def normalize_employee(raw: dict) -> dict:
    scores = raw.get("scores") or {}
    normalized_scores = {}
    for key in SCORE_KEYS:
        try:
            value = float(scores.get(key, 80))
        except (TypeError, ValueError):
            value = 80
        normalized_scores[key] = max(0, min(100, value))

    return {
        "id": str(raw.get("id") or uuid.uuid4()),
        "name": str(raw.get("name") or "未命名"),
        "role": str(raw.get("role") or "初中级开发工程师"),
        "performancePay": float(raw.get("performancePay") or 0),
        "baseSalary": float(raw.get("baseSalary") or 0),
        "positionSalary": float(raw.get("positionSalary") or 0),
        "manager": str(raw.get("manager") or ""),
        "scores": normalized_scores,
        "note": str(raw.get("note") or ""),
    }


def row_value(row, key: str):
    if isinstance(row, sqlite3.Row):
        return row[key]
    return row[key]


def row_to_employee(row) -> dict:
    employee = normalize_employee(
        {
            "id": row_value(row, "id"),
            "name": row_value(row, "name"),
            "role": row_value(row, "role"),
            "performancePay": row_value(row, "performance_pay"),
            "baseSalary": row_value(row, "base_salary"),
            "positionSalary": row_value(row, "position_salary"),
            "manager": row_value(row, "manager"),
            "scores": json.loads(row_value(row, "scores_json") or "{}"),
            "note": row_value(row, "note"),
        }
    )
    return employee


def read_state(period: str) -> dict:
    with connect() as conn:
        rows = execute(
            conn,
            """
            SELECT *
            FROM performance_records
            WHERE period = ?
            ORDER BY name
            """,
            (period,),
        ).fetchall()
    return {"period": period, "employees": [row_to_employee(row) for row in rows]}


def write_state(period: str, employees: list[dict]) -> dict:
    normalized = [normalize_employee(employee) for employee in employees]
    stamp = now_iso()
    with connect() as conn:
        execute(conn, "DELETE FROM performance_records WHERE period = ?", (period,))
        for employee in normalized:
            execute(
                conn,
                """
                INSERT INTO performance_records (
                    period, id, name, role, performance_pay, base_salary, position_salary,
                    manager, scores_json, note, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    period,
                    employee["id"],
                    employee["name"],
                    employee["role"],
                    employee["performancePay"],
                    employee["baseSalary"],
                    employee["positionSalary"],
                    employee["manager"],
                    json.dumps(employee["scores"], ensure_ascii=False),
                    employee["note"],
                    stamp,
                    stamp,
                ),
            )
        conn.commit()
    return {"period": period, "employees": normalized}


def load_seed(period: str) -> dict:
    seed_path = ROOT / "test-data.json"
    with seed_path.open("r", encoding="utf-8-sig") as handle:
        data = json.load(handle)
    data["period"] = period
    return write_state(period, data.get("employees", []))


class Handler(SimpleHTTPRequestHandler):
    server_version = "PerformanceHTTP/1.0"

    def translate_path(self, path: str) -> str:
        parsed = urlparse(path)
        clean_path = parsed.path.lstrip("/") or "index.html"
        return str((ROOT / clean_path).resolve())

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json({"ok": True, "engine": DB_ENGINE, "db": DATABASE_URL or str(DB_PATH)})
            return
        if parsed.path == "/api/state":
            query = parse_qs(parsed.query)
            period = query.get("period", [""])[0] or datetime.now().strftime("%Y-%m")
            if query.get("seed", ["0"])[0] == "1":
                self.send_json(load_seed(period))
            else:
                self.send_json(read_state(period))
            return
        super().do_GET()

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/api/state":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            payload = self.read_json()
            period = str(payload.get("period") or datetime.now().strftime("%Y-%m"))
            employees = payload.get("employees") or []
            if not isinstance(employees, list):
                raise ValueError("employees must be a list")
            self.send_json(write_state(period, employees))
        except Exception as exc:  # noqa: BLE001 - API returns validation errors as JSON.
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length)
        if not body:
            return {}
        return json.loads(body.decode("utf-8"))

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def guess_type(self, path: str) -> str:
        if path.endswith(".md"):
            return "text/markdown; charset=utf-8"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"


def main() -> int:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Performance system listening on http://{HOST}:{PORT}")
    print(f"Database engine: {DB_ENGINE}")
    print(f"Database: {DATABASE_URL or DB_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping server")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
