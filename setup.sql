BEGIN;
CREATE ROLE cubismo WITH
  LOGIN
  CREATEDB
  ENCRYPTED PASSWORD 'fmRxyP-I,:k3xT';
END;
COMMIT;

CREATE DATABASE cubismo
    WITH
    OWNER = cubismo
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;
