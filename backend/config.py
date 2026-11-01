import os
from dotenv import load_dotenv
from sqlalchemy.engine import URL, make_url

load_dotenv()


def _database_url():
    database_url = os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL")
    if database_url:
        url = make_url(database_url)
        if url.drivername == "mysql":
            url = url.set(drivername="mysql+pymysql")
        return url

    return URL.create(
        "mysql+pymysql",
        username=os.getenv("MYSQLUSER", os.getenv("DB_USER", "root")),
        password=os.getenv("MYSQLPASSWORD", os.getenv("DB_PASSWORD", "1234")),
        host=os.getenv("MYSQLHOST", os.getenv("DB_HOST", "localhost")),
        port=int(os.getenv("MYSQLPORT", os.getenv("DB_PORT", "3306"))),
        database=os.getenv("MYSQLDATABASE", os.getenv("DB_NAME", "inventory_manager")),
    )


class Config:
    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,https://pmod.netlify.app",
        ).split(",")
        if origin.strip()
    ]