from sqlalchemy.ext.declarative import declarative_base

# Separate bases for System (SQLite) and User (Postgres) DBs
SystemBase = declarative_base()
UserBase = declarative_base()
